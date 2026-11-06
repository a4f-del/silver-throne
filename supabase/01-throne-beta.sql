-- Silver Throne BETA - schemă Tron + funcții exportate din serverul LIVE.
-- Nu copiaza jucatori sau rezultate. Ruleaza DOAR in proiectul BETA.
-- Migrarea 1v1 din PR #10 se aplica ULTERIOR, dupa script.
-- Seed-ul configuratiei a fost reconstruit din tron-logic.js si world-data.js.

BEGIN;
CREATE TABLE IF NOT EXISTS public.throne_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS public.throne_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  level integer NOT NULL,
  title text,
  units jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.throne_state (
  id integer PRIMARY KEY,
  holder uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  since timestamptz,
  protect_until timestamptz,
  last_week integer
);
CREATE TABLE IF NOT EXISTS public.throne_reigns (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.throne_challenges (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  holder_at_start uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  finished boolean NOT NULL DEFAULT false,
  won boolean NOT NULL DEFAULT false,
  crowned boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.throne_results (
  week integer NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank integer,
  kind text NOT NULL,
  seconds integer NOT NULL DEFAULT 0,
  level integer NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  material text,
  amount integer NOT NULL DEFAULT 0,
  claimed_at timestamptz,
  PRIMARY KEY (week, user_id)
);
CREATE INDEX IF NOT EXISTS throne_reigns_user ON public.throne_reigns(user_id,started_at);
CREATE INDEX IF NOT EXISTS throne_challenges_user ON public.throne_challenges(user_id,started_at);
ALTER TABLE public.throne_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.throne_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.throne_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.throne_reigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.throne_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.throne_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.throne_config, public.throne_profiles, public.throne_state,
  public.throne_reigns, public.throne_challenges, public.throne_results
  FROM PUBLIC, anon, authenticated;
INSERT INTO public.throne_state(id, holder, since, protect_until, last_week)
VALUES (1, NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.throne_config(key,value) VALUES ('tz', '"Europe/Bucharest"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('anchor_local', '"2026-10-30 15:00:00"'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('week_days', '7'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('min_level', '10'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('max_units', '3'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('protect_min', '30'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('cooldown_s', '120'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('daily_cap', '10'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('prize', '{"king":1.5,"k2":1,"k3":0.6,"part":0.25}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('titles', '{"king":"Regele Tronului","k2":"Cavaler al Coroanei","k3":"Cavaler al Coroanei","part":"Pretendent la Tron"}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('mat_levels', '{"osn":5,"fie":6,"ven":12,"cen":20}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.throne_config(key,value) VALUES ('cap', '{"Campion":{"hp":2870,"atk":345,"def":243},"Arcaș":{"hp":1322,"atk":281,"def":124},"Paznic":{"hp":1338,"atk":228,"def":162},"Războinic":{"hp":1262,"atk":245,"def":167},"Mag":{"hp":1264,"atk":233,"def":121},"Vraci":{"hp":1164,"atk":287,"def":160},"Gardian":{"hp":1396,"atk":223,"def":217}}'::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

CREATE OR REPLACE FUNCTION public.throne_cfg(k text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ select value from public.throne_config where key = k $function$;

CREATE OR REPLACE FUNCTION public.throne_now()
 RETURNS timestamp with time zone
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  select coalesce((select (value #>> '{}')::timestamptz from public.throne_config where key = 'fake_now'), clock_timestamp())
$function$;

CREATE OR REPLACE FUNCTION public.throne_week_end(k integer)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select (((public.throne_cfg('anchor_local') #>> '{}')::timestamp
           + make_interval(days => k * (public.throne_cfg('week_days') #>> '{}')::int))
          at time zone (public.throne_cfg('tz') #>> '{}'))
$function$;

CREATE OR REPLACE FUNCTION public.throne_week_start(k integer)
 RETURNS timestamp with time zone
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select case when k <= 0 then '-infinity'::timestamptz else public.throne_week_end(k - 1) end
$function$;

CREATE OR REPLACE FUNCTION public.throne_week_index(t timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare k int := 0;
begin
  while t >= public.throne_week_end(k) loop k := k + 1; end loop;
  return k;
end $function$;

CREATE OR REPLACE FUNCTION public.throne_amount(p_kind text, p_level integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select greatest(1, ceil(((public.throne_cfg('prize') ->> p_kind)::numeric) * (2 + floor(greatest(p_level, 0) / 5.0)) - 0.000000001))::int
$function$;

CREATE OR REPLACE FUNCTION public.throne_ranking(p_start timestamp with time zone, p_end timestamp with time zone, p_asof timestamp with time zone)
 RETURNS TABLE(user_id uuid, seconds integer, rank integer, first_from timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select x.user_id, x.secs, (row_number() over (order by x.secs desc, x.first_from asc))::int, x.first_from
  from (
    select r.user_id,
           floor(sum(extract(epoch from (least(coalesce(r.ended_at, p_asof), p_end, p_asof) - greatest(r.started_at, p_start)))))::int as secs,
           min(greatest(r.started_at, p_start)) as first_from
    from public.throne_reigns r
    where r.started_at < least(p_end, p_asof) and coalesce(r.ended_at, p_asof) > p_start
    group by r.user_id
  ) x
  where x.secs >= 1
  order by x.secs desc, x.first_from asc
$function$;

CREATE OR REPLACE FUNCTION public.throne_reason(p_uid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_now timestamptz := public.throne_now(); p public.throne_profiles%rowtype; st public.throne_state%rowtype;
        v_last timestamptz; v_today int; tzn text := public.throne_cfg('tz') #>> '{}';
begin
  select * into p from public.throne_profiles where user_id = p_uid;
  select * into st from public.throne_state where id = 1;
  if not found or p.user_id is null then return 'Publică-ți apărarea mai întâi'; end if;
  if p.level < (public.throne_cfg('min_level') #>> '{}')::int then return 'Nivel minim ' || (public.throne_cfg('min_level') #>> '{}'); end if;
  if st.holder = p_uid then return 'Ești deja pe Tron'; end if;
  if st.holder is not null and v_now < st.protect_until then return 'Regele e protejat încă puțin'; end if;
  select max(started_at) into v_last from public.throne_challenges where user_id = p_uid;
  if v_last is not null and v_last + make_interval(secs => (public.throne_cfg('cooldown_s') #>> '{}')::int) > v_now then return 'Pauză între provocări'; end if;
  select count(*) into v_today from public.throne_challenges
   where user_id = p_uid and (started_at at time zone tzn)::date = (v_now at time zone tzn)::date;
  if v_today >= (public.throne_cfg('daily_cap') #>> '{}')::int then return 'Ai atins limita zilnică'; end if;
  return null;
end $function$;

CREATE OR REPLACE FUNCTION public.throne_finalize(w integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_start timestamptz := public.throne_week_start(w); v_end timestamptz := public.throne_week_end(w); r record;
begin
  update public.throne_reigns set ended_at = v_end where ended_at is null;
  update public.throne_state set holder = null, since = null, protect_until = null where id = 1;
  for r in select * from public.throne_ranking(v_start, v_end, v_end) order by rank loop
    insert into public.throne_results (week, user_id, rank, kind, seconds, level)
    values (w, r.user_id, r.rank, case when r.rank = 1 then 'king' when r.rank = 2 then 'k2' when r.rank = 3 then 'k3' else 'part' end, r.seconds,
            coalesce((select level from public.throne_profiles where user_id = r.user_id), 1))
    on conflict (week, user_id) do nothing;
  end loop;
  insert into public.throne_results (week, user_id, rank, kind, seconds, level)
  select w, c.user_id, null, 'part', 0, coalesce(p.level, 1)
  from (select distinct user_id from public.throne_challenges where finished and started_at >= v_start and started_at < v_end) c
  left join public.throne_profiles p on p.user_id = c.user_id
  on conflict (week, user_id) do nothing;
  update public.throne_profiles p set title = (public.throne_cfg('titles') ->> rs.kind)
  from public.throne_results rs where rs.week = w and rs.user_id = p.user_id;
end $function$;

CREATE OR REPLACE FUNCTION public.throne_rollover()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_cur int; v_last int; w int;
begin
  perform 1 from public.throne_state where id = 1 for update;
  v_cur := public.throne_week_index(public.throne_now());
  select last_week into v_last from public.throne_state where id = 1;
  if v_last is null then update public.throne_state set last_week = v_cur where id = 1; return; end if;
  w := v_last;
  while w < v_cur loop perform public.throne_finalize(w); w := w + 1; end loop;
  update public.throne_state set last_week = v_cur where id = 1;
end $function$;

CREATE OR REPLACE FUNCTION public.throne_publish(p_name text, p_level integer, p_ghost jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); u jsonb; c jsonb; v_out jsonb := '[]'::jsonb; hp numeric; atk numeric; def numeric; v_name text;
begin
  if v_uid is null then raise exception 'Neautentificat'; end if;
  perform public.throne_rollover();
  if p_level is null or p_level < (public.throne_cfg('min_level') #>> '{}')::int then raise exception 'Nivel prea mic: minim %', public.throne_cfg('min_level') #>> '{}'; end if;
  if p_level > 200 then raise exception 'Nivel invalid'; end if;
  if p_ghost is null or jsonb_typeof(p_ghost -> 'units') is distinct from 'array'
     or jsonb_array_length(p_ghost -> 'units') < 1 or jsonb_array_length(p_ghost -> 'units') > (public.throne_cfg('max_units') #>> '{}')::int then
    raise exception 'Apărare invalidă';
  end if;
  for u in select * from jsonb_array_elements(p_ghost -> 'units') loop
    c := public.throne_cfg('cap') -> (u ->> 'c');
    if c is null then raise exception 'Apărare invalidă'; end if;
    begin hp := (u ->> 'hp')::numeric; atk := (u ->> 'atk')::numeric; def := (u ->> 'def')::numeric;
    exception when others then raise exception 'Apărare invalidă'; end;
    if hp is null or atk is null or def is null or hp <= 0 or atk < 0 or def < 0 then raise exception 'Apărare invalidă'; end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'n', left(coalesce(u ->> 'n', 'Luptător'), 20), 'c', u ->> 'c',
      'hp',  greatest(1, least(round(hp),  (c ->> 'hp')::numeric))::int,
      'atk', greatest(1, least(round(atk), (c ->> 'atk')::numeric))::int,
      'def', greatest(0, least(round(def), (c ->> 'def')::numeric))::int));
  end loop;
  v_name := coalesce(nullif(left(regexp_replace(coalesce(p_name, ''), '[<>&"]', '', 'g'), 20), ''), 'Jucător');
  insert into public.throne_profiles (user_id, name, level, units, updated_at) values (v_uid, v_name, p_level, v_out, public.throne_now())
  on conflict (user_id) do update set name = excluded.name, level = excluded.level, units = excluded.units, updated_at = excluded.updated_at;
  return jsonb_build_object('ok', true, 'units', v_out);
end $function$;

CREATE OR REPLACE FUNCTION public.throne_challenge_start()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_reason text; st public.throne_state%rowtype; v_id bigint; v_units jsonb; v_hname text; v_now timestamptz;
begin
  if v_uid is null then raise exception 'Neautentificat'; end if;
  perform public.throne_rollover();
  select * into st from public.throne_state where id = 1 for update;
  v_now := public.throne_now();
  v_reason := public.throne_reason(v_uid);
  if v_reason is not null then raise exception '%', v_reason; end if;
  if exists (select 1 from public.throne_challenges where user_id = v_uid and not finished and started_at > v_now - interval '15 minutes') then raise exception 'Ai deja o provocare în desfășurare'; end if;
  insert into public.throne_challenges (user_id, week, started_at, holder_at_start) values (v_uid, public.throne_week_index(v_now), v_now, st.holder) returning id into v_id;
  if st.holder is null then return jsonb_build_object('id', v_id, 'ghost', null, 'holder_name', null); end if;
  select units, name into v_units, v_hname from public.throne_profiles where user_id = st.holder;
  return jsonb_build_object('id', v_id, 'ghost', jsonb_build_object('units', v_units), 'holder_name', v_hname);
end $function$;

CREATE OR REPLACE FUNCTION public.throne_challenge_finish(p_id bigint, p_win boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); c public.throne_challenges%rowtype; st public.throne_state%rowtype; v_now timestamptz;
begin
  if v_uid is null then raise exception 'Neautentificat'; end if;
  perform public.throne_rollover();
  select * into st from public.throne_state where id = 1 for update;
  select * into c from public.throne_challenges where id = p_id and user_id = v_uid for update;
  if not found then raise exception 'Provocare necunoscută'; end if;
  if c.finished then return jsonb_build_object('crowned', c.crowned, 'reason', 'Deja înregistrată'); end if;
  v_now := public.throne_now();
  update public.throne_challenges set finished = true, won = coalesce(p_win, false) where id = c.id;
  if not coalesce(p_win, false) then return jsonb_build_object('crowned', false, 'reason', 'Înfrângere'); end if;
  if c.week <> public.throne_week_index(v_now) then return jsonb_build_object('crowned', false, 'reason', 'Săptămâna s-a încheiat în timpul luptei'); end if;
  if st.holder is distinct from c.holder_at_start then return jsonb_build_object('crowned', false, 'reason', 'Tronul a schimbat stăpânul în timpul luptei'); end if;
  update public.throne_reigns set ended_at = v_now where ended_at is null;
  insert into public.throne_reigns (user_id, started_at) values (v_uid, v_now);
  update public.throne_state set holder = v_uid, since = v_now, protect_until = v_now + make_interval(mins => (public.throne_cfg('protect_min') #>> '{}')::int) where id = 1;
  update public.throne_challenges set crowned = true where id = c.id;
  return jsonb_build_object('crowned', true, 'reason', 'Ai ocupat Tronul');
end $function$;

CREATE OR REPLACE FUNCTION public.throne_claim(p_week integer, p_material text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); r public.throne_results%rowtype; v_amt int;
begin
  if v_uid is null then raise exception 'Neautentificat'; end if;
  perform public.throne_rollover();
  select * into r from public.throne_results where week = p_week and user_id = v_uid for update;
  if not found then raise exception 'Nu ai premiu în acea săptămână'; end if;
  if r.claimed then raise exception 'Premiul a fost deja revendicat'; end if;
  if not exists (select 1 from jsonb_each_text(public.throne_cfg('mat_levels')) m where m.key = p_material and r.level >= m.value::int) then raise exception 'Material indisponibil la nivelul tău'; end if;
  v_amt := public.throne_amount(r.kind, r.level);
  update public.throne_results set claimed = true, material = p_material, amount = v_amt, claimed_at = public.throne_now() where week = p_week and user_id = v_uid;
  return jsonb_build_object('week', p_week, 'kind', r.kind, 'title', public.throne_cfg('titles') ->> r.kind, 'material', p_material, 'amount', v_amt);
end $function$;

CREATE OR REPLACE FUNCTION public.throne_get()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_now timestamptz; v_w int; v_start timestamptz; v_end timestamptz; st public.throne_state%rowtype; me public.throne_profiles%rowtype;
        v_holder jsonb := null; v_rank jsonb; v_part int; v_reason text; v_last timestamptz; v_today int; v_cd bigint := 0; v_pend jsonb; v_hall jsonb; tzn text := public.throne_cfg('tz') #>> '{}';
begin
  if v_uid is null then raise exception 'Neautentificat'; end if;
  perform public.throne_rollover();
  v_now := public.throne_now(); v_w := public.throne_week_index(v_now); v_start := public.throne_week_start(v_w); v_end := public.throne_week_end(v_w);
  select * into st from public.throne_state where id = 1;
  select * into me from public.throne_profiles where user_id = v_uid;
  if st.holder is not null then
    select jsonb_build_object('user_id', p.user_id, 'name', p.name, 'level', p.level, 'since', (extract(epoch from st.since) * 1000)::bigint,
           'protect_until', (extract(epoch from st.protect_until) * 1000)::bigint,
           'power', (select coalesce(sum((x ->> 'hp')::numeric + 6 * (x ->> 'atk')::numeric + 10 * (x ->> 'def')::numeric), 0)::bigint from jsonb_array_elements(p.units) x))
      into v_holder from public.throne_profiles p where p.user_id = st.holder;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'name', coalesce(p.name, 'Necunoscut'), 'seconds', r.seconds, 'rank', r.rank, 'is_holder', (r.user_id = st.holder)) order by r.rank), '[]'::jsonb)
    into v_rank from public.throne_ranking(v_start, v_end, v_now) r left join public.throne_profiles p on p.user_id = r.user_id;
  select count(distinct user_id) into v_part from public.throne_challenges where finished and started_at >= v_start and started_at < v_end;
  v_reason := public.throne_reason(v_uid);
  select max(started_at) into v_last from public.throne_challenges where user_id = v_uid;
  if v_last is not null then v_cd := (extract(epoch from (v_last + make_interval(secs => (public.throne_cfg('cooldown_s') #>> '{}')::int))) * 1000)::bigint; end if;
  select count(*) into v_today from public.throne_challenges where user_id = v_uid and (started_at at time zone tzn)::date = (v_now at time zone tzn)::date;
  select coalesce(jsonb_agg(jsonb_build_object('week', rs.week, 'kind', rs.kind, 'rank', rs.rank, 'seconds', rs.seconds, 'level', rs.level,
           'amount', public.throne_amount(rs.kind, rs.level), 'title', public.throne_cfg('titles') ->> rs.kind,
           'options', (select coalesce(jsonb_agg(m.key order by m.value::int), '[]'::jsonb) from jsonb_each_text(public.throne_cfg('mat_levels')) m where rs.level >= m.value::int)) order by rs.week), '[]'::jsonb)
    into v_pend from public.throne_results rs where rs.user_id = v_uid and not rs.claimed;
  select coalesce(jsonb_agg(h order by (h ->> 'week')::int desc), '[]'::jsonb) into v_hall from (
    select jsonb_build_object('week', w.week, 'top', (select coalesce(jsonb_agg(jsonb_build_object('name', coalesce(p.name, 'Necunoscut'), 'rank', t.rank, 'seconds', t.seconds) order by t.rank), '[]'::jsonb)
             from public.throne_results t left join public.throne_profiles p on p.user_id = t.user_id where t.week = w.week and t.rank is not null and t.rank <= 3)) as h
    from (select distinct week from public.throne_results order by week desc limit 8) w) hh;
  return jsonb_build_object(
    'now', (extract(epoch from v_now) * 1000)::bigint, 'week', v_w, 'week_end', (extract(epoch from v_end) * 1000)::bigint,
    'holder', v_holder, 'ranking', v_rank, 'participants', v_part,
    'me', jsonb_build_object('user_id', v_uid, 'level', me.level, 'title', me.title, 'can_challenge', (v_reason is null), 'reason', v_reason,
          'cooldown_until', v_cd, 'challenges_today', v_today, 'daily_cap', (public.throne_cfg('daily_cap') #>> '{}')::int, 'pending', v_pend),
    'hall', v_hall);
end $function$;

REVOKE ALL ON FUNCTION public.throne_cfg(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_now() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_week_end(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_week_start(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_week_index(timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_amount(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_ranking(timestamp with time zone, timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_reason(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_finalize(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_rollover() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_publish(text, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_challenge_start() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_challenge_finish(bigint, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_claim(integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.throne_get() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.throne_get(), public.throne_publish(text,integer,jsonb),
  public.throne_challenge_start(), public.throne_challenge_finish(bigint,boolean),
  public.throne_claim(integer,text) TO authenticated;
COMMIT;
