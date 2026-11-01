-- ============================================================================
-- Silver Throne — 02-lume.sql
-- Lumea comună: satele reale ale jucătorilor pe o hartă care crește, atacuri între jucători
-- (cu bara de atacuri care se reface singură), clasament și profiluri publice.
--
-- Se rulează O DATĂ în Supabase → SQL Editor (după tabelele Tronului: throne_reigns, throne_challenges, throne_state). Se poate rula din nou fără grijă:
-- tabelele se creează doar dacă lipsesc, funcțiile se înlocuiesc.
--
-- Reguli (aceleași valori sunt în lume.js, LW.CFG, doar pentru afișare; serverul decide):
--   • fiecare jucător primește un loc la prima intrare, în spirală în jurul Tronului (0,0);
--   • bara de atacuri: maxim 18, se reface câte unul la 80 de minute (= 18 pe zi);
--   • același jucător poate fi atacat de tine o dată la 6 ore;
--   • atacă și pot fi atacați doar jucătorii de nivel 5+ (începătorii sunt protejați);
--   • apărătorul NU pierde nimic: prada o calculează jocul atacatorului, ca la satele-bot;
--   • lupta se calculează în browser (ca la Tron); serverul ține evidența și limitele.
--
-- Tabelele au RLS pornit și nicio politică: nimeni nu le citește direct, doar prin funcțiile de mai jos.
-- ============================================================================

create table if not exists public.world_players (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  x            int  not null,
  y            int  not null,
  name         text not null default 'Erou',
  level        int  not null default 1,
  power        int  not null default 0,
  territories  int  not null default 0,
  stage        int  not null default 0,
  stage_name   text not null default 'Tabără',
  title        text not null default '',
  hero         jsonb not null default '{}'::jsonb,
  units        jsonb not null default '[]'::jsonb,
  en           real not null default 18,           -- atacuri în bară la momentul en_t
  en_t         timestamptz not null default now(),
  raids_won    int not null default 0,
  raids_lost   int not null default 0,
  def_won      int not null default 0,
  def_lost     int not null default 0,
  joined_at    timestamptz not null default now(),
  seen_at      timestamptz not null default now(),
  constraint world_players_xy unique (x, y)
);
alter table public.world_players enable row level security;

create table if not exists public.world_raids (
  id           bigserial primary key,
  attacker     uuid not null references public.world_players (user_id) on delete cascade,
  defender     uuid not null references public.world_players (user_id) on delete cascade,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  win          boolean,
  gold         int,
  xp           int
);
alter table public.world_raids enable row level security;
create index if not exists world_raids_att on public.world_raids (attacker, started_at desc);
create index if not exists world_raids_def on public.world_raids (defender, started_at desc);

-- ------------------------------------------------------------------ CONFIGURARE
create or replace function public.world_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'en_max',      18,     -- atacuri în bară
    'en_regen_min', 80,    -- minute pentru un atac nou
    'same_h',      6,      -- ore între două atacuri asupra aceluiași jucător
    'min_level',   5,      -- nivel minim ca să ataci sau să fii atacat
    'timeout_min', 20      -- un atac neterminat după atâtea minute se socotește pierdut
  );
$$;

-- ------------------------------------------------------------------ AJUTOARE
create or replace function public.world_ms(t timestamptz) returns bigint language sql immutable as $$
  select (extract(epoch from t) * 1000)::bigint;
$$;

-- atacuri disponibile acum (bara se reface în timp)
create or replace function public.world_en(p_en real, p_t timestamptz) returns real language sql stable as $$
  select least((public.world_cfg()->>'en_max')::real,
               p_en + extract(epoch from (now() - p_t))::real / (60 * (public.world_cfg()->>'en_regen_min')::real));
$$;

-- Tronul: câte încoronări (provocări încheiate cu încoronare) și cât timp total a ținut fiecare jucător Tronul.
-- O domnie încă deschisă se numără până acum doar dacă jucătorul e regele actual (throne_state).
create or replace function public.world_throne_counts()
returns table (user_id uuid, crowns int, seconds bigint)
language sql stable set search_path = public as $$
  with c as (
    select tc.user_id, count(*)::int as crowns
    from throne_challenges tc
    where tc.crowned
    group by tc.user_id
  ),
  s as (
    select r.user_id,
           sum(greatest(0, extract(epoch from (
             coalesce(r.ended_at,
                      case when r.user_id = (select holder from throne_state order by id limit 1)
                           then now() else r.started_at end)
             - r.started_at))))::bigint as seconds
    from throne_reigns r
    group by r.user_id
  )
  select coalesce(c.user_id, s.user_id), coalesce(c.crowns, 0), coalesce(s.seconds, 0)
  from c full join s on s.user_id = c.user_id;
$$;

-- închide atacurile rămase deschise prea mult (tab închis în timpul luptei): se socotesc pierdute
create or replace function public.world_close_stale(p_user uuid) returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select w.id, w.defender from world_raids w
           where w.attacker = p_user and w.finished_at is null
             and w.started_at < now() - make_interval(mins => (world_cfg()->>'timeout_min')::int)
  loop
    update world_raids set finished_at = now(), win = false, gold = 0, xp = 0 where id = r.id;
    update world_players set raids_lost = raids_lost + 1 where user_id = p_user;
    update world_players set def_won = def_won + 1 where user_id = r.defender;
  end loop;
end $$;

-- primul loc liber în spirală (inele pătrate în jurul Tronului, de la interior spre exterior)
create or replace function public.world_free_cell(out cx int, out cy int) language plpgsql security definer set search_path = public as $$
declare r int; i int; px int; py int;
begin
  for r in 1..500 loop
    for i in 0..(8 * r - 1) loop
      if i < 2 * r then px := -r + i; py := -r;                 -- latura de sus, spre dreapta
      elsif i < 4 * r then px := r; py := -r + (i - 2 * r);     -- latura din dreapta, în jos
      elsif i < 6 * r then px := r - (i - 4 * r); py := r;      -- latura de jos, spre stânga
      else px := -r; py := r - (i - 6 * r);                     -- latura din stânga, în sus
      end if;
      if not exists (select 1 from world_players w where w.x = px and w.y = py) then cx := px; cy := py; return; end if;
    end loop;
  end loop;
  raise exception 'Harta e plină.';
end $$;

-- validarea instantaneului unei echipe (aceleași reguli ca la Tron: 1..3 luptători, clase cunoscute, valori finite)
create or replace function public.world_units_ok(u jsonb) returns boolean language plpgsql immutable as $$
declare e jsonb;
begin
  if u is null or jsonb_typeof(u) is distinct from 'array' or jsonb_array_length(u) < 1 or jsonb_array_length(u) > 3 then return false; end if;
  for e in select * from jsonb_array_elements(u) loop
    if jsonb_typeof(e) is distinct from 'object'
       or coalesce(e->>'c', '') not in ('Campion','Arcaș','Paznic','Războinic','Mag','Vraci','Gardian')
       or jsonb_typeof(e->'hp') is distinct from 'number' or jsonb_typeof(e->'atk') is distinct from 'number' or jsonb_typeof(e->'def') is distinct from 'number'
       or (e->>'hp')::numeric <= 0 or (e->>'hp')::numeric > 1e6
       or (e->>'atk')::numeric < 0 or (e->>'atk')::numeric > 1e6
       or (e->>'def')::numeric < 0 or (e->>'def')::numeric > 1e6 then
      return false;
    end if;
  end loop;
  return true;
end $$;

-- ------------------------------------------------------------------ CITIRE
create or replace function public.world_get() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); me world_players; cfg jsonb := world_cfg(); v_en real; res jsonb;
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;
  perform world_close_stale(uid);
  select * into me from world_players where user_id = uid;
  if found then
    update world_players set seen_at = now() where user_id = uid;
    v_en := world_en(me.en, me.en_t);
  end if;
  select jsonb_build_object(
    'now', world_ms(now()),
    'cfg', cfg,
    'me', case when me.user_id is null then null else jsonb_build_object(
        'user_id', me.user_id, 'x', me.x, 'y', me.y, 'level', me.level, 'en', v_en, 'en_at', world_ms(now()),
        'open', (select jsonb_build_object('id', r.id, 'defender', r.defender) from world_raids r
                 where r.attacker = uid and r.finished_at is null order by r.id desc limit 1)) end,
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', w.user_id, 'name', w.name, 'x', w.x, 'y', w.y, 'level', w.level, 'power', w.power,
        'stage', w.stage, 'stage_name', w.stage_name, 'title', w.title, 'territories', w.territories,
        'hero', w.hero, 'seen', world_ms(w.seen_at),
        'cd', (select world_ms(max(r.started_at) + make_interval(hours => (cfg->>'same_h')::int))
               from world_raids r where r.attacker = uid and r.defender = w.user_id
                 and r.started_at > now() - make_interval(hours => (cfg->>'same_h')::int))
      ) order by w.joined_at)
      from (select * from world_players order by joined_at limit 2000) w), '[]'::jsonb),
    'log', coalesce((
      select jsonb_agg(x order by (x->>'t')::bigint desc) from (
        select jsonb_build_object('t', world_ms(r.finished_at), 'att', r.attacker = uid,
               'other', case when r.attacker = uid then d.name else a.name end,
               'other_id', case when r.attacker = uid then r.defender else r.attacker end,
               'win', r.win, 'gold', r.gold, 'xp', r.xp) as x
        from world_raids r join world_players a on a.user_id = r.attacker join world_players d on d.user_id = r.defender
        where (r.attacker = uid or r.defender = uid) and r.finished_at is not null
        order by r.finished_at desc limit 15) q), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- ------------------------------------------------------------------ INTRARE / ACTUALIZARE
-- p: {name, level, power, territories, stage, stage_name, title, hero:{n,c}, units:[{n,c,hp,atk,def}]}
create or replace function public.world_join(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record; nm text;
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;
  if not world_units_ok(p->'units') then raise exception 'Echipa trimisă nu e validă.'; end if;
  nm := left(btrim(coalesce(p->>'name', '')), 20); if nm = '' then nm := 'Erou'; end if;
  if not exists (select 1 from world_players where user_id = uid) then
    perform pg_advisory_xact_lock(hashtext('world_join'));      -- două înscrieri simultane nu primesc același loc
    select * into c from world_free_cell();
    insert into world_players (user_id, x, y, name) values (uid, c.cx, c.cy, nm) on conflict (user_id) do nothing;
  end if;
  update world_players set
    name        = nm,
    level       = greatest(1, least(500, coalesce((p->>'level')::numeric, 1)::int)),
    power       = greatest(0, least(100000000, coalesce((p->>'power')::numeric, 0)::int)),
    territories = greatest(0, least(1000, coalesce((p->>'territories')::numeric, 0)::int)),
    stage       = greatest(0, least(20, coalesce((p->>'stage')::numeric, 0)::int)),
    stage_name  = left(coalesce(p->>'stage_name', 'Tabără'), 30),
    title       = left(coalesce(p->>'title', ''), 40),
    hero        = jsonb_build_object('n', left(coalesce(p->'hero'->>'n', nm), 20), 'c', left(coalesce(p->'hero'->>'c', 'Campion'), 20),
                                   'ic', case when coalesce(p->'hero'->>'ic', '') ~ '^[mf][1-9]$' then p->'hero'->>'ic' else '' end),
    units       = p->'units',
    seen_at     = now()
  where user_id = uid;
  return world_get();
end $$;

-- ------------------------------------------------------------------ ATAC
create or replace function public.world_raid_start(p_target uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cfg jsonb := world_cfg(); me world_players; t world_players; v_en real; v_last timestamptz; rid bigint; mins int;
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;
  perform world_close_stale(uid);
  select * into me from world_players where user_id = uid for update;
  if not found then raise exception 'Intră întâi în Lume.'; end if;
  if me.level < (cfg->>'min_level')::int then raise exception 'Poți ataca alți jucători de la nivelul %.', cfg->>'min_level'; end if;
  if p_target = uid then raise exception 'Nu-ți poți ataca propriul sat.'; end if;
  if exists (select 1 from world_raids r where r.attacker = uid and r.finished_at is null) then raise exception 'Ai deja un atac în curs.'; end if;
  select * into t from world_players where user_id = p_target;
  if not found then raise exception 'Jucătorul nu mai există.'; end if;
  if t.level < (cfg->>'min_level')::int then raise exception '% e încă începător (sub nivelul %) și e protejat.', t.name, cfg->>'min_level'; end if;
  select max(r.started_at) into v_last from world_raids r where r.attacker = uid and r.defender = p_target;
  if v_last is not null and v_last > now() - make_interval(hours => (cfg->>'same_h')::int) then
    mins := ceil(extract(epoch from (v_last + make_interval(hours => (cfg->>'same_h')::int) - now())) / 60);
    raise exception 'L-ai atacat recent pe %. Poți din nou peste % h % min.', t.name, mins / 60, mins % 60;
  end if;
  v_en := world_en(me.en, me.en_t);
  if v_en < 1 then
    mins := ceil((1 - v_en) * (cfg->>'en_regen_min')::real);
    raise exception 'Nu mai ai atacuri. Următorul se reface în % min.', mins;
  end if;
  update world_players set en = v_en - 1, en_t = now() where user_id = uid;
  insert into world_raids (attacker, defender) values (uid, p_target) returning id into rid;
  return jsonb_build_object('id', rid, 'name', t.name, 'level', t.level, 'units', t.units, 'hero', t.hero, 'en', v_en - 1);
end $$;

create or replace function public.world_raid_finish(p_id bigint, p_win boolean, p_gold int, p_xp int) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r world_raids;
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;
  select * into r from world_raids where id = p_id and attacker = uid for update;
  if not found then raise exception 'Atac necunoscut.'; end if;
  if r.finished_at is not null then return jsonb_build_object('ok', true, 'win', r.win, 'already', true); end if;
  update world_raids set finished_at = now(), win = coalesce(p_win, false),
    gold = greatest(0, least(10000000, coalesce(p_gold, 0))), xp = greatest(0, least(10000000, coalesce(p_xp, 0)))
  where id = p_id;
  if coalesce(p_win, false) then
    update world_players set raids_won = raids_won + 1 where user_id = uid;
    update world_players set def_lost = def_lost + 1 where user_id = r.defender;
  else
    update world_players set raids_lost = raids_lost + 1 where user_id = uid;
    update world_players set def_won = def_won + 1 where user_id = r.defender;
  end if;
  return jsonb_build_object('ok', true, 'win', coalesce(p_win, false));
end $$;

-- ------------------------------------------------------------------ CLASAMENT
-- p_kind: level | power | terr | tron
create or replace function public.world_board(p_kind text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); res jsonb;
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;
  with tc as (select * from world_throne_counts()),
  base as (
    select w.user_id, w.name, w.level, w.power, w.territories, w.stage_name, w.title, w.hero, w.joined_at,
           coalesce(tc.crowns, 0) as crowns, coalesce(tc.seconds, 0) as seconds,
           case p_kind when 'power' then w.power::numeric when 'terr' then w.territories::numeric
                       when 'tron' then coalesce(tc.seconds, 0)::numeric else w.level::numeric end as v,
           case p_kind when 'level' then w.power::numeric when 'tron' then coalesce(tc.crowns, 0)::numeric else w.level::numeric end as v2
    from world_players w left join tc on tc.user_id = w.user_id
    where p_kind <> 'tron' or coalesce(tc.seconds, 0) > 0
  ),
  ranked as (select b.*, row_number() over (order by v desc, v2 desc, joined_at) as rk from base b)
  select jsonb_build_object(
    'kind', p_kind,
    'total', (select count(*) from ranked),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', rk, 'id', user_id, 'name', name, 'level', level, 'power', power,
              'territories', territories, 'stage_name', stage_name, 'title', title, 'hero', hero, 'crowns', crowns, 'seconds', seconds) order by rk)
             from ranked where rk <= 50), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', rk, 'level', level, 'power', power, 'territories', territories, 'crowns', crowns, 'seconds', seconds)
           from ranked where user_id = uid)
  ) into res;
  return res;
end $$;

-- ------------------------------------------------------------------ PROFIL
create or replace function public.world_profile(p_user uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w world_players; res jsonb; cfg jsonb := world_cfg();
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;
  select * into w from world_players where user_id = p_user;
  if not found then raise exception 'Jucătorul nu există.'; end if;
  select jsonb_build_object(
    'id', w.user_id, 'me', w.user_id = uid, 'name', w.name, 'level', w.level, 'power', w.power, 'territories', w.territories,
    'stage', w.stage, 'stage_name', w.stage_name, 'title', w.title, 'hero', w.hero, 'units', w.units,
    'x', w.x, 'y', w.y, 'joined', world_ms(w.joined_at), 'seen', world_ms(w.seen_at),
    'raids_won', w.raids_won, 'raids_lost', w.raids_lost, 'def_won', w.def_won, 'def_lost', w.def_lost,
    'tron', (select jsonb_build_object('crowns', crowns, 'seconds', seconds) from world_throne_counts() t where t.user_id = w.user_id),
    'ranks', jsonb_build_object(
      'level', (select count(*) + 1 from world_players o where o.level > w.level or (o.level = w.level and (o.power > w.power or (o.power = w.power and o.joined_at < w.joined_at)))),
      'power', (select count(*) + 1 from world_players o where o.power > w.power or (o.power = w.power and (o.level > w.level or (o.level = w.level and o.joined_at < w.joined_at)))),
      'total', (select count(*) from world_players)),
    'cd', (select world_ms(max(r.started_at) + make_interval(hours => (cfg->>'same_h')::int)) from world_raids r
           where r.attacker = uid and r.defender = w.user_id and r.started_at > now() - make_interval(hours => (cfg->>'same_h')::int)),
    'recent', coalesce((select jsonb_agg(x order by (x->>'t')::bigint desc) from (
        select jsonb_build_object('t', world_ms(r.finished_at), 'att', r.attacker = w.user_id,
               'other', case when r.attacker = w.user_id then d.name else a.name end, 'win', r.win) as x
        from world_raids r join world_players a on a.user_id = r.attacker join world_players d on d.user_id = r.defender
        where (r.attacker = w.user_id or r.defender = w.user_id) and r.finished_at is not null
        order by r.finished_at desc limit 8) q), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- ------------------------------------------------------------------ DREPTURI
-- funcțiile se pot apela doar de jucători conectați; ajutoarele interne nu se pot apela din afară
revoke all on function public.world_close_stale(uuid), public.world_free_cell(), public.world_units_ok(jsonb),
  public.world_get(), public.world_join(jsonb), public.world_raid_start(uuid), public.world_raid_finish(bigint, boolean, int, int),
  public.world_board(text), public.world_profile(uuid), public.world_throne_counts() from public, anon;
grant execute on function public.world_get(), public.world_join(jsonb), public.world_raid_start(uuid),
  public.world_raid_finish(bigint, boolean, int, int), public.world_board(text), public.world_profile(uuid) to authenticated;
revoke all on function public.world_close_stale(uuid), public.world_free_cell(), public.world_throne_counts() from authenticated;
