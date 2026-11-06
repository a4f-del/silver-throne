-- Silver Throne BETA — instalare completa fara Docker
-- DOAR in proiectul "Silver-Throne-Test", NICIODATA pe LIVE.
-- Preconditii: ai rulat 07-beta-access.sql din PR #11,
-- ai invitat contul admin BETA si apare in public.beta_admins.
-- NU copiaza utilizatori, conturi, salvări ori istoricul din LIVE.
-- Include migrarea Tron 1v1 doar pentru acest proiect BETA.
-- NOTE: administrarea accesului la RPC pe BETA depinde de permiterea doar a conturilor admin in Authentication.


-- ########################################################################
-- ETAPA 1/8: supabase/00-beta-core.sql (sursa feature/beta-sql-bootstrap)
-- ########################################################################

-- Silver Throne BETA: salvări și roluri (fara progresul utilizatorilor LIVE).
-- PRECONDITIE: supabase/07-beta-access.sql din PR #11 a fost rulat pe BETA.
BEGIN;
CREATE TABLE IF NOT EXISTS public.game_saves(
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  game_data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS game_saves_select ON public.game_saves;
DROP POLICY IF EXISTS game_saves_insert ON public.game_saves;
DROP POLICY IF EXISTS game_saves_update ON public.game_saves;
CREATE POLICY game_saves_select ON public.game_saves FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND public.is_beta_admin());
CREATE POLICY game_saves_insert ON public.game_saves FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND public.is_beta_admin());
CREATE POLICY game_saves_update ON public.game_saves FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND public.is_beta_admin())
  WITH CHECK ((select auth.uid()) = user_id AND public.is_beta_admin());
GRANT SELECT, INSERT, UPDATE ON public.game_saves TO authenticated;

CREATE TABLE IF NOT EXISTS public.admins(
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admins FROM PUBLIC, anon, authenticated;
-- Pe BETA, administratorii invitati sunt si administratori de joc.
INSERT INTO public.admins(user_id)
SELECT user_id FROM public.beta_admins
ON CONFLICT(user_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = (select auth.uid()))
$fn$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
COMMIT;



-- ########################################################################
-- ETAPA 2/8: supabase/01-throne-beta.sql (sursa feature/beta-sql-bootstrap)
-- ########################################################################

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



-- ########################################################################
-- ETAPA 3/8: supabase/02-lume.sql (sursa main)
-- ########################################################################

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



-- ########################################################################
-- ETAPA 4/8: supabase/04-portret.sql (sursa main)
-- ########################################################################

-- ============================================================================
-- Silver Throne — 04-portret.sql
-- Portretul eroului (erou.js) apare și la ceilalți jucători: în Lume, în clasament și în profil.
-- Înlocuiește doar funcția world_join din 02-lume.sql, ca să păstreze și id-ul portretului (m1..m9, f1..f9).
-- Se rulează O DATĂ în Supabase → SQL Editor. (02-lume.sql conține deja aceeași versiune.)
-- ============================================================================

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



-- ########################################################################
-- ETAPA 5/8: supabase/05-portofel.sql (sursa main)
-- ########################################################################

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



-- ########################################################################
-- ETAPA 6/8: supabase/08-bazar-beta.sql (sursa feature/beta-sql-bootstrap)
-- ########################################################################

-- Silver Throne BETA — Bazar (SQL furnizat din configuratia LIVE).
-- Ruleaza dupa 00-beta-core.sql, 01-throne-beta.sql, 02-lume.sql,
-- 04-portret.sql si 05-portofel.sql, DOAR in proiectul BETA.
-- Acest script adauga si pend_gold, si inlocuieste wallet_sync.
alter table public.wallet add column if not exists pend_gold bigint not null default 0;

create table if not exists public.bazar_listings (
  id          bigint generated always as identity primary key,
  seller      uuid not null references auth.users on delete cascade,
  item        jsonb not null,
  ihash       text not null,
  price       bigint not null check (price > 0),
  item_lvl    int not null,
  item_t      text not null,
  item_r      int not null,
  state       text not null default 'open',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '48 hours',
  buyer       uuid,
  closed_at   timestamptz
);
create index if not exists bazar_open on public.bazar_listings (item_t, item_lvl) where state = 'open';
create index if not exists bazar_seller on public.bazar_listings (seller, created_at desc);

create table if not exists public.bazar_inbox (
  id         bigint generated always as identity primary key,
  owner      uuid not null references auth.users on delete cascade,
  item       jsonb not null,
  reason     text not null,
  created_at timestamptz not null default now(),
  claimed    boolean not null default false
);
create index if not exists bazar_inbox_owner on public.bazar_inbox (owner) where not claimed;

alter table public.bazar_listings enable row level security;
alter table public.bazar_inbox   enable row level security;
drop policy if exists bazar_read on public.bazar_listings;
create policy bazar_read on public.bazar_listings for select using (state = 'open' or seller = auth.uid() or buyer = auth.uid());
drop policy if exists inbox_read on public.bazar_inbox;
create policy inbox_read on public.bazar_inbox for select using (auth.uid() = owner);
-- scriere: nicio politica; totul trece prin functiile de mai jos

-- ---------------------------------------------------------------- REGULILE
create or replace function public.bazar_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object('fee_list', 0.02, 'fee_sale', 0.05, 'max_open', 10, 'hours', 48, 'min_lvl', 15, 'max_mult', 50)
$$;
create or replace function public.bazar_shop(l int, r int) returns bigint language sql immutable as $$ select (4 + l * 3 * (r + 1))::bigint $$;
create or replace function public.bazar_cap(k text, l int) returns numeric language sql immutable as $$
  select (case k when 'dmg' then 34 + 9.29 * l when 'def' then 15 + 5.14 * l when 'hp' then 67 + 17.49 * l
                 when 'bleed' then 95 + 2.69 * l when 'crit' then 48 + 0.56 * l when 'loot' then 34 + 3.5 * l
                 when 'heal' then 55 + 6.7 * l when 'vd' then 24 when 'pd' then 34 + 0.43 * l
                 when 'ph' then 14 + 0.57 * l when 'pf' then 7 + 0.51 * l else -1 end) * 1.15 + 3
$$;

create or replace function public.bazar_valid(p jsonb, p_lvl int) returns text language plpgsql immutable as $$
declare k text; v jsonb; l int; c numeric;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'Obiect greșit.'; end if;
  if length(p::text) > 3000 then return 'Obiect prea mare.'; end if;
  if coalesce(p ->> 't', '') not in ('w', 'a', 'h', 'b', 'j', 'r') then return 'Tip de obiect necunoscut.'; end if;
  if p ? 'lg' and p ->> 'lg' is not null then return 'Legendarele sunt legate de cont și nu se vând.'; end if;
  if jsonb_typeof(p -> 'l') <> 'number' or jsonb_typeof(p -> 'r') <> 'number' then return 'Obiect greșit.'; end if;
  l := (p ->> 'l')::numeric::int;
  if l < 1 or l > least(60, p_lvl + 10) or (p ->> 'l')::numeric <> l then return 'Nivelul obiectului nu e posibil pentru tine.'; end if;
  if (p ->> 'r')::numeric not in (0, 1, 2, 3) then return 'Raritate greșită.'; end if;
  if p ? 'q' and (jsonb_typeof(p -> 'q') <> 'number' or (p ->> 'q')::numeric not between 0 and 4) then return 'Calitate greșită.'; end if;
  if p ? 'up' and p -> 'up' <> 'null'::jsonb and (jsonb_typeof(p -> 'up') <> 'number' or (p ->> 'up')::numeric not between 0 and 9) then return 'Treaptă greșită.'; end if;
  if jsonb_typeof(p -> 'name') <> 'string' or length(p ->> 'name') > 90 then return 'Nume greșit.'; end if;
  if jsonb_typeof(p -> 's') <> 'object' then return 'Obiect fără statistici.'; end if;
  for k, v in select key, value from jsonb_each(p -> 's') loop
    if jsonb_typeof(v) <> 'number' then return 'Statistică greșită: ' || k; end if;
    c := public.bazar_cap(k, l);
    if c < 0 then return 'Statistică necunoscută: ' || k; end if;
    if (v::text)::numeric > c or (v::text)::numeric < -60 then return 'Statistică imposibilă: ' || k; end if;
  end loop;
  return null;
end $$;

create or replace function public.bazar_list(p_item jsonb, p_price bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w public.wallet%rowtype; cfg jsonb := public.bazar_cfg(); err text; l int; r int; up int; mn bigint; mx bigint; fee bigint; h text; nid bigint;
begin
  if uid is null then raise exception 'Conectează-te.'; end if;
  select * into w from public.wallet where user_id = uid for update;
  if not found then raise exception 'Portofelul nu e încă sincronizat. Încearcă din nou peste câteva secunde.'; end if;
  if w.lvl < (cfg ->> 'min_lvl')::int then raise exception 'Bazarul se deschide la nivelul %.', cfg ->> 'min_lvl'; end if;
  err := public.bazar_valid(p_item, w.lvl); if err is not null then raise exception '%', err; end if;
  if (select count(*) from public.bazar_listings where seller = uid and state = 'open') >= (cfg ->> 'max_open')::int then
    raise exception 'Ai deja % oferte active.', cfg ->> 'max_open'; end if;
  h := md5(p_item::text);
  if exists (select 1 from public.bazar_listings where seller = uid and ihash = h and state = 'open') then raise exception 'Obiectul e deja la vânzare.'; end if;
  l := (p_item ->> 'l')::numeric::int; r := (p_item ->> 'r')::numeric::int; up := coalesce((p_item ->> 'up')::numeric::int, 0);
  mn := public.bazar_shop(l, r); mx := (mn * (cfg ->> 'max_mult')::int * (1 + up / 3.0))::bigint;
  if p_price < mn or p_price > mx then raise exception 'Prețul trebuie să fie între % și % aur.', mn, mx; end if;
  fee := ceil(p_price * (cfg ->> 'fee_list')::numeric);
  if w.gold + w.pend_gold < fee then raise exception 'Taxa de listare e % aur.', fee; end if;
  update public.wallet set pend_gold = pend_gold - fee where user_id = uid;
  insert into public.bazar_listings (seller, item, ihash, price, item_lvl, item_t, item_r, expires_at)
  values (uid, p_item, h, p_price, l, p_item ->> 't', r, now() + make_interval(hours => (cfg ->> 'hours')::int))
  returning id into nid;
  return jsonb_build_object('id', nid, 'fee', fee);
end $$;

create or replace function public.bazar_cancel(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); x public.bazar_listings%rowtype;
begin
  select * into x from public.bazar_listings where id = p_id for update;
  if not found or x.seller <> uid then raise exception 'Oferta nu e a ta.'; end if;
  if x.state <> 'open' then raise exception 'Oferta nu mai e activă.'; end if;
  update public.bazar_listings set state = 'cancelled', closed_at = now() where id = p_id;
  insert into public.bazar_inbox (owner, item, reason) values (uid, x.item, 'retras');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.bazar_expire() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; x record;
begin
  for x in select * from public.bazar_listings where state = 'open' and expires_at <= now() for update skip locked loop
    update public.bazar_listings set state = 'expired', closed_at = now() where id = x.id;
    insert into public.bazar_inbox (owner, item, reason) values (x.seller, x.item, 'expirat'); n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.bazar_buy(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); x public.bazar_listings%rowtype; wb public.wallet%rowtype; cfg jsonb := public.bazar_cfg(); net bigint;
begin
  if uid is null then raise exception 'Conectează-te.'; end if;
  select * into x from public.bazar_listings where id = p_id for update;
  if not found or x.state <> 'open' or x.expires_at <= now() then raise exception 'Oferta nu mai e disponibilă.'; end if;
  if x.seller = uid then raise exception 'Nu-ți poți cumpăra propria ofertă.'; end if;
  perform 1 from public.wallet where user_id in (uid, x.seller) order by user_id for update;
  select * into wb from public.wallet where user_id = uid;
  if not found then raise exception 'Portofelul nu e încă sincronizat. Încearcă din nou.'; end if;
  if wb.lvl < (cfg ->> 'min_lvl')::int then raise exception 'Bazarul se deschide la nivelul %.', cfg ->> 'min_lvl'; end if;
  if wb.gold + wb.pend_gold < x.price then raise exception 'Îți trebuie % aur.', x.price; end if;
  net := x.price - floor(x.price * (cfg ->> 'fee_sale')::numeric);
  update public.wallet set pend_gold = pend_gold - x.price where user_id = uid;
  update public.wallet set pend_gold = pend_gold + net where user_id = x.seller;
  update public.bazar_listings set state = 'sold', buyer = uid, closed_at = now() where id = p_id;
  insert into public.bazar_inbox (owner, item, reason) values (uid, x.item, 'cumparat');
  return jsonb_build_object('ok', true, 'price', x.price);
end $$;

create or replace function public.bazar_browse(p_t text default null, p_lmin int default 1, p_lmax int default 60, p_r int default null, p_page int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb; tot int;
begin
  perform public.bazar_expire();
  select count(*) into tot from public.bazar_listings b where b.state = 'open' and (p_t is null or b.item_t = p_t) and b.item_lvl between p_lmin and p_lmax and (p_r is null or b.item_r = p_r);
  select coalesce(jsonb_agg(row_to_json(q)), '[]'::jsonb) into res from (
    select b.id, b.item, b.price, b.expires_at, b.seller = auth.uid() as mine, coalesce(p.name, 'Jucător') as seller_name
    from public.bazar_listings b left join public.world_players p on p.user_id = b.seller
    where b.state = 'open' and (p_t is null or b.item_t = p_t) and b.item_lvl between p_lmin and p_lmax and (p_r is null or b.item_r = p_r)
    order by b.price asc, b.id asc limit 30 offset greatest(0, p_page) * 30) q;
  return jsonb_build_object('rows', res, 'total', tot, 'cfg', public.bazar_cfg());
end $$;

create or replace function public.bazar_mine() returns jsonb
language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  perform public.bazar_expire();
  select coalesce(jsonb_agg(row_to_json(q)), '[]'::jsonb) into res from (
    select id, item, price, state, created_at, expires_at, closed_at from public.bazar_listings
    where seller = auth.uid() and (state = 'open' or closed_at > now() - interval '7 days') order by created_at desc limit 40) q;
  return jsonb_build_object('rows', res, 'inbox', (select count(*) from public.bazar_inbox where owner = auth.uid() and not claimed));
end $$;

create or replace function public.bazar_claim() returns jsonb
language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  with c as (update public.bazar_inbox set claimed = true where owner = auth.uid() and not claimed returning item, reason)
  select coalesce(jsonb_agg(jsonb_build_object('item', item, 'reason', reason)), '[]'::jsonb) into res from c;
  return res;
end $$;

create or replace function public.bazar_admin_cancel(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare x public.bazar_listings%rowtype;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then raise exception 'Doar administratorii.'; end if;
  select * into x from public.bazar_listings where id = p_id for update;
  if not found or x.state <> 'open' then raise exception 'Oferta nu e activă.'; end if;
  update public.bazar_listings set state = 'cancelled', closed_at = now() where id = p_id;
  insert into public.bazar_inbox (owner, item, reason) values (x.seller, x.item, 'retras');
  return jsonb_build_object('ok', true);
end $$;

do $$ declare f text; begin
  foreach f in array array['bazar_list(jsonb,bigint)','bazar_cancel(bigint)','bazar_buy(bigint)','bazar_browse(text,int,int,int,int)','bazar_mine()','bazar_claim()','bazar_expire()','bazar_admin_cancel(bigint)'] loop
    execute 'revoke all on function public.' || f || ' from public';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

-- ---------------------------------------------------------------- PORTOFELUL, cu aurul din bazar
create or replace function public.wallet_sync(p_gold bigint, p_ore bigint, p_mats jsonb, p_lvl int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w public.wallet%rowtype;
  h double precision; nl int; lim int; mpl double precision; up int; la timestamptz;
  bg double precision; bo double precision; bm double precision;
  ng bigint; nore bigint; nm jsonb := '{}'::jsonb; k text; v bigint; old bigint; gain bigint; ok bigint;
  v_cut bigint := 0; tot bigint; pg bigint;
begin
  if uid is null then raise exception 'neautificat'; end if;
  p_lvl := greatest(1, least(coalesce(p_lvl, 1), 100));
  p_gold := greatest(0, coalesce(p_gold, 0)); p_ore := greatest(0, coalesce(p_ore, 0));
  if p_mats is null or jsonb_typeof(p_mats) <> 'object' then p_mats := '{}'::jsonb; end if;

  if exists (select 1 from public.admins a where a.user_id = uid) then
    select coalesce(pend_gold, 0) into pg from public.wallet where user_id = uid for update;
    p_gold := greatest(0, p_gold + coalesce(pg, 0));
    insert into public.wallet as x (user_id, gold, ore, mats, lvl, lvl_at, synced_at)
    values (uid, p_gold, p_ore, p_mats, p_lvl, now(), now())
    on conflict (user_id) do update set gold = excluded.gold, ore = excluded.ore, mats = excluded.mats,
      lvl = excluded.lvl, lvl_at = now(), synced_at = now(), pend_gold = 0;
    return jsonb_build_object('gold', p_gold, 'ore', p_ore, 'mats', p_mats, 'lvl', p_lvl, 'cut', false, 'admin', true);
  end if;

  select * into w from public.wallet where user_id = uid for update;
  if found and coalesce(w.pend_gold, 0) <> 0 then
    p_gold := greatest(0, p_gold + w.pend_gold); w.gold := greatest(0, w.gold + w.pend_gold);
    update public.wallet set gold = w.gold, pend_gold = 0 where user_id = uid;
  end if;
  if not found then
    tot := 0;
    for k, v in select key, greatest(0, least((value)::text::numeric, 1e9))::bigint from jsonb_each(p_mats) loop
      if v > 0 then nm := nm || jsonb_build_object(k, v); tot := tot + v; end if;
    end loop;
    lim := 1000 + 100 * p_lvl;
    if tot > lim then
      select coalesce(jsonb_object_agg(key, floor((value)::text::numeric * lim / tot)::bigint), '{}'::jsonb) into nm from jsonb_each(nm);
    end if;
    insert into public.wallet (user_id, gold, ore, mats, lvl, b_gold, b_ore, b_mat)
    values (uid, least(p_gold, 3000 + 4000 * p_lvl), least(p_ore, 500 + 150 * p_lvl), nm, p_lvl,
            public.wallet_rate(p_lvl, 'gold'), public.wallet_rate(p_lvl, 'ore'), public.wallet_rate(p_lvl, 'mat'))
    returning * into w;
    return jsonb_build_object('gold', w.gold, 'ore', w.ore, 'mats', w.mats, 'lvl', w.lvl, 'cut', (w.gold < p_gold or w.ore < p_ore), 'first', true);
  end if;

  h := least(12, greatest(0, extract(epoch from now() - w.synced_at) / 3600.0));
  mpl := case when w.lvl < 10 then 2 when w.lvl < 20 then 6 when w.lvl < 30 then 15 else 30 end;
  up := least(3, floor(extract(epoch from now() - w.lvl_at) / 60.0 / mpl)::int);
  nl := greatest(w.lvl, least(p_lvl, w.lvl + up)); la := case when nl > w.lvl then now() else w.lvl_at end;
  bg := least(w.b_gold + h * public.wallet_rate(nl, 'gold'), 12 * public.wallet_rate(nl, 'gold'));
  bo := least(w.b_ore  + h * public.wallet_rate(nl, 'ore'),  12 * public.wallet_rate(nl, 'ore'));
  bm := least(w.b_mat  + h * public.wallet_rate(nl, 'mat'),  12 * public.wallet_rate(nl, 'mat'));

  if p_gold <= w.gold then ng := p_gold; else gain := p_gold - w.gold; ok := least(gain, floor(bg)::bigint); ng := w.gold + ok; bg := bg - ok; v_cut := v_cut + (gain - ok); end if;
  if p_ore  <= w.ore  then nore := p_ore; else gain := p_ore - w.ore; ok := least(gain, floor(bo)::bigint); nore := w.ore + ok; bo := bo - ok; v_cut := v_cut + (gain - ok); end if;
  for k in select distinct key from (select key from jsonb_each(p_mats) union select key from jsonb_each(w.mats)) q loop
    v := greatest(0, coalesce((p_mats ->> k)::numeric, 0))::bigint; old := coalesce((w.mats ->> k)::numeric, 0)::bigint;
    if v <= old then ok := v; else gain := v - old; ok := old + least(gain, floor(bm)::bigint); bm := bm - least(gain, floor(bm)::bigint); v_cut := v_cut + (v - ok); end if;
    if ok > 0 then nm := nm || jsonb_build_object(k, ok); end if;
  end loop;

  update public.wallet set gold = ng, ore = nore, mats = nm, lvl = nl, b_gold = bg, b_ore = bo, b_mat = bm,
         cut = w.cut + v_cut, lvl_at = la, synced_at = now() where user_id = uid;
  return jsonb_build_object('gold', ng, 'ore', nore, 'mats', nm, 'lvl', nl, 'cut', v_cut > 0);
end $$;

revoke all on function public.wallet_sync(bigint, bigint, jsonb, int) from public;
grant execute on function public.wallet_sync(bigint, bigint, jsonb, int) to authenticated;



-- ########################################################################
-- ETAPA 7/8: supabase/03-cont.sql (sursa main)
-- ########################################################################

-- ============================================================================
-- Silver Throne — 03-cont.sql
-- Ștergerea contului de către jucător (cerută de Google Play pentru aplicațiile cu conturi).
-- Se rulează O DATĂ în Supabase → SQL Editor, după 02-lume.sql. Se poate rula din nou fără grijă.
--
-- delete_my_account() șterge TOT ce ține de jucătorul conectat: salvarea, profilul și istoricul de la Tron,
-- satul din Lume și atacurile lui, apoi contul însuși (auth.users). Totul se face într-o singură tranzacție:
-- dacă un pas eșuează, nu se șterge nimic și jucătorul vede eroarea.
-- Cine ține Tronul în momentul ștergerii îl lasă gol.
-- ============================================================================

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;

  -- Tronul: dacă e rege acum, Tronul rămâne gol
  update public.throne_state set holder = null, since = now() where holder = uid;

  -- provocările altora în care el era regele: păstrăm provocarea, doar fără numele lui (dacă tabela permite)
  begin
    update public.throne_challenges set holder_at_start = null where holder_at_start = uid and user_id <> uid;
  exception when not_null_violation then null;
  end;

  delete from public.throne_challenges where user_id = uid;
  delete from public.throne_reigns     where user_id = uid;
  delete from public.throne_results    where user_id = uid;
  delete from public.throne_profiles   where user_id = uid;

  delete from public.world_raids   where attacker = uid or defender = uid;
  delete from public.world_players where user_id = uid;

  delete from public.game_saves where user_id = uid;

  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;



-- ########################################################################
-- ETAPA 8/8: supabase/06-tron-duel-1v1.sql (sursa feature/throne-hero-duel-draft)
-- ########################################################################

-- Silver Throne — migrare Tron 1v1
-- Aplică manual în Supabase SQL Editor doar după pregătirea clientului.
-- Clientul trebuie să publice un singur erou cu p_ghost.v = 2.
-- ATENȚIE: protecția anti-trișat necesită statistici calculate server-side,
-- din datele reale ale eroului. Limitele int32 de aici sunt numai tehnice.
BEGIN;

ALTER TABLE public.throne_profiles
  ADD COLUMN IF NOT EXISTS duel_version integer NOT NULL DEFAULT 1;

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
     or jsonb_array_length(p_ghost -> 'units') <> 1
     or p_ghost ->> 'v' is distinct from '2' then
    raise exception 'Apărare invalidă: este necesar un singur erou (versiunea 2)';
  end if;
  for u in select * from jsonb_array_elements(p_ghost -> 'units') loop
    c := public.throne_cfg('cap') -> (u ->> 'c');
    if c is null then raise exception 'Apărare invalidă'; end if;
    begin hp := (u ->> 'hp')::numeric; atk := (u ->> 'atk')::numeric; def := (u ->> 'def')::numeric;
    exception when others then raise exception 'Apărare invalidă'; end;
    if hp is null or atk is null or def is null or hp <= 0 or atk < 0 or def < 0
       or hp > 2147483647 or atk > 2147483647 or def > 2147483647 then
      raise exception 'Statistici în afara limitelor tehnice';
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'n', left(coalesce(u ->> 'n', 'Erou'), 20), 'c', u ->> 'c',
      'hp', greatest(1, round(hp))::int,
      'atk', greatest(1, round(atk))::int,
      'def', greatest(0, round(def))::int));
  end loop;
  v_name := coalesce(nullif(left(regexp_replace(coalesce(p_name, ''), '[<>&""]', '', 'g'), 20), ''), 'Jucător');
  insert into public.throne_profiles (user_id, name, level, units, duel_version, updated_at)
  values (v_uid, v_name, p_level, v_out, 2, public.throne_now())
  on conflict (user_id) do update set name = excluded.name, level = excluded.level,
    units = excluded.units, duel_version = excluded.duel_version, updated_at = excluded.updated_at;
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
  -- Refuzăm apărările vechi fără să consumăm o provocare.
  -- Nu presupunem că primul mercenar dintr-o echipă veche este eroul.
  if st.holder is not null and not exists (
    select 1 from public.throne_profiles p where p.user_id = st.holder
      and p.duel_version = 2 and jsonb_typeof(p.units) = 'array'
      and jsonb_array_length(p.units) = 1
  ) then
    raise exception 'Regele trebuie să-și actualizeze apărarea pentru duelul 1v1';
  end if;
  insert into public.throne_challenges (user_id, week, started_at, holder_at_start)
  values (v_uid, public.throne_week_index(v_now), v_now, st.holder) returning id into v_id;
  if st.holder is null then return jsonb_build_object('id', v_id, 'ghost', null, 'holder_name', null); end if;
  select units, name into v_units, v_hname from public.throne_profiles where user_id = st.holder;
  return jsonb_build_object('id', v_id, 'ghost', jsonb_build_object('units', v_units), 'holder_name', v_hname);
end $function$;

COMMIT;

-- Diagnostic: apărări vechi care trebuie republicate.
SELECT user_id, name, level, duel_version,
       CASE WHEN jsonb_typeof(units) = 'array' THEN jsonb_array_length(units) ELSE NULL END AS luptatori
FROM public.throne_profiles
WHERE duel_version <> 2 OR jsonb_typeof(units) <> 'array'
   OR jsonb_array_length(units) <> 1;

