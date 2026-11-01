-- ============================================================================
-- Silver Throne — 05-portofel.sql
-- Portofelul pe server: aurul, minereul, materialele și nivelul fiecărui jucător.
-- Jocul trimite periodic ce are; serverul acceptă orice cheltuială, dar câștigurile doar până la o
-- „rezervă de câștig” care se umple în timp (ritmul de mai jos, cel mult 12 ore). Ce trece de ea se taie.
-- Ritmurile sunt de 2–3 ori peste ce poate câștiga un jucător foarte activ (măsurat prin simulare).
-- Rulează după 01-throne.sql și 02-lume.sql. Se poate rula de mai multe ori.
-- ============================================================================

create table if not exists public.wallet (
  user_id      uuid primary key references auth.users on delete cascade,
  gold         bigint not null default 0,
  ore          bigint not null default 0,
  mats         jsonb  not null default '{}'::jsonb,
  lvl          int    not null default 1,
  b_gold       double precision not null default 0,   -- rezerva de câștig rămasă
  b_ore        double precision not null default 0,
  b_mat        double precision not null default 0,
  cut          bigint not null default 0,              -- câte unități au fost tăiate (semn de trișat)
  lvl_at       timestamptz not null default now(),     -- când s-a acceptat ultimul nivel
  synced_at    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
alter table public.wallet add column if not exists lvl_at timestamptz not null default now();
alter table public.wallet enable row level security;
drop policy if exists wallet_read on public.wallet;
create policy wallet_read on public.wallet for select using (auth.uid() = user_id);
-- nicio politică de scriere: portofelul se schimbă doar prin wallet_sync

-- ritmul de câștig pe oră, după nivel
create or replace function public.wallet_rate(p_lvl int, p_k text) returns double precision
language sql immutable as $$
  select case p_k when 'gold' then 4000 + 600 * p_lvl
                  when 'ore'  then 300 + 30 * p_lvl
                  else 800 + 30 * p_lvl end::double precision
$$;

create or replace function public.wallet_sync(p_gold bigint, p_ore bigint, p_mats jsonb, p_lvl int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w public.wallet%rowtype;
  h double precision; nl int; lim int; mpl double precision; up int; la timestamptz;
  bg double precision; bo double precision; bm double precision;
  ng bigint; nore bigint; nm jsonb := '{}'::jsonb; k text; v bigint; old bigint; gain bigint; ok bigint;
  cut bigint := 0; tot bigint;
begin
  if uid is null then raise exception 'neautentificat'; end if;
  p_lvl := greatest(1, least(coalesce(p_lvl, 1), 100));
  p_gold := greatest(0, coalesce(p_gold, 0)); p_ore := greatest(0, coalesce(p_ore, 0));
  if p_mats is null or jsonb_typeof(p_mats) <> 'object' then p_mats := '{}'::jsonb; end if;

  select * into w from public.wallet where user_id = uid for update;
  if not found then
    -- prima sincronizare (inclusiv jucătorii existenți): ce aduc din salvare, până la o limită după nivel
    tot := 0;
    for k, v in select key, greatest(0, least((value)::text::numeric, 1e9))::bigint from jsonb_each(p_mats) loop
      if v > 0 then nm := nm || jsonb_build_object(k, v); tot := tot + v; end if;
    end loop;
    lim := 1000 + 100 * p_lvl;
    if tot > lim then   -- materialele în plus se micșorează proporțional
      select coalesce(jsonb_object_agg(key, floor((value)::text::numeric * lim / tot)::bigint), '{}'::jsonb) into nm from jsonb_each(nm);
    end if;
    insert into public.wallet (user_id, gold, ore, mats, lvl, b_gold, b_ore, b_mat)
    values (uid, least(p_gold, 3000 + 4000 * p_lvl), least(p_ore, 500 + 150 * p_lvl), nm, p_lvl,
            public.wallet_rate(p_lvl, 'gold'), public.wallet_rate(p_lvl, 'ore'), public.wallet_rate(p_lvl, 'mat'))
    returning * into w;
    return jsonb_build_object('gold', w.gold, 'ore', w.ore, 'mats', w.mats, 'lvl', w.lvl, 'cut', (w.gold < p_gold or w.ore < p_ore), 'first', true);
  end if;

  h := least(12, greatest(0, extract(epoch from now() - w.synced_at) / 3600.0));
  -- nivelul: cel mult unul la 2 / 6 / 15 / 30 de minute și cel mult 3 deodată (sub 10 / 10–19 / 20–29 / 30+), după timpul de la ultimul nivel acceptat; nu scade niciodată
  mpl := case when w.lvl < 10 then 2 when w.lvl < 20 then 6 when w.lvl < 30 then 15 else 30 end;
  up := least(3, floor(extract(epoch from now() - w.lvl_at) / 60.0 / mpl)::int);   -- cel mult 3 niveluri la o sincronizare, oricât timp a trecut
  nl := greatest(w.lvl, least(p_lvl, w.lvl + up)); la := case when nl > w.lvl then now() else w.lvl_at end;
  -- rezerva de câștig se umple cu ritmul nivelului, până la 12 ore
  bg := least(w.b_gold + h * public.wallet_rate(nl, 'gold'), 12 * public.wallet_rate(nl, 'gold'));
  bo := least(w.b_ore  + h * public.wallet_rate(nl, 'ore'),  12 * public.wallet_rate(nl, 'ore'));
  bm := least(w.b_mat  + h * public.wallet_rate(nl, 'mat'),  12 * public.wallet_rate(nl, 'mat'));

  -- aurul și minereul: cheltuielile trec, câștigurile până la rezervă
  if p_gold <= w.gold then ng := p_gold; else gain := p_gold - w.gold; ok := least(gain, floor(bg)::bigint); ng := w.gold + ok; bg := bg - ok; cut := cut + (gain - ok); end if;
  if p_ore  <= w.ore  then nore := p_ore; else gain := p_ore - w.ore; ok := least(gain, floor(bo)::bigint); nore := w.ore + ok; bo := bo - ok; cut := cut + (gain - ok); end if;
  -- materialele: fiecare tip, din aceeași rezervă comună
  for k in select distinct key from (select key from jsonb_each(p_mats) union select key from jsonb_each(w.mats)) q loop
    v := greatest(0, coalesce((p_mats ->> k)::numeric, 0))::bigint; old := coalesce((w.mats ->> k)::numeric, 0)::bigint;
    if v <= old then ok := v; else gain := v - old; ok := old + least(gain, floor(bm)::bigint); bm := bm - least(gain, floor(bm)::bigint); cut := cut + (v - ok); end if;
    if ok > 0 then nm := nm || jsonb_build_object(k, ok); end if;
  end loop;

  update public.wallet set gold = ng, ore = nore, mats = nm, lvl = nl, b_gold = bg, b_ore = bo, b_mat = bm,
         cut = w.cut + cut, lvl_at = la, synced_at = now() where user_id = uid;
  return jsonb_build_object('gold', ng, 'ore', nore, 'mats', nm, 'lvl', nl, 'cut', cut > 0);
end $$;

revoke all on function public.wallet_sync(bigint, bigint, jsonb, int) from public;
grant execute on function public.wallet_sync(bigint, bigint, jsonb, int) to authenticated;

-- Nivelul din Lume și din clasament: cel acceptat de portofel (un nivel crescut din consolă nu apare acolo)
create or replace function public.wallet_cap_level() returns trigger language plpgsql security definer set search_path = public as $$
declare wl int;
begin
  select lvl into wl from public.wallet where user_id = new.user_id;
  if wl is not null and new.level > wl then new.level := wl; end if;
  return new;
end $$;
drop trigger if exists world_players_cap_level on public.world_players;
create trigger world_players_cap_level before insert or update of level on public.world_players
  for each row execute function public.wallet_cap_level();
