-- Silver Throne · SQL28 · BETA / PAS33 · plafoane server-side pe clase pentru Lume si Tron.
-- MANUAL numai in Supabase Silver-Throne-Test, dupa SQL21-27. NU LIVE.
-- Protectie concreta: nu mai accepta valori hp/atk/def de pana la 1.000.000.
-- Limite LARGI = 10x limitele de referinta nivel 40 din tron-logic.js.
-- Aceste limite NU certifica itemele, nivelul sau proprietatea statistica.
-- PRE-FLIGHT: daca o echipa BETA existenta depaseste limita, tranzactia
-- se anuleaza complet. Nu modifica unitati, raiduri, salvari sau progres.
-- Nu se modifica RPC world_join, world_raid_finish sau throne_publish.

BEGIN;

DO $prerequisites$
BEGIN
 IF to_regclass('public.world_players') IS NULL
    OR to_regclass('public.throne_profiles') IS NULL
    OR to_regclass('public.beta_world_combat_simulations') IS NULL
    OR to_regprocedure('public.world_units_ok(jsonb)') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
    RAISE EXCEPTION 'SQL28 necesita Lume, Tron 1v1, SQL21 si SQL27 in BETA.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='throne_profiles'
      AND column_name='duel_version'
 ) THEN
    RAISE EXCEPTION 'SQL28 necesita Tronul 1v1 cu duel_version.';
 END IF;
END
$prerequisites$;

-- Limitele sunt publice si conservatoare; nu includ nivelul sau itemele
-- pentru ca proprietatea acestora nu este inca verificata de server.
-- Exact aceleasi valori de referinta ca in ST_T.CAP (tron-logic.js).
CREATE OR REPLACE FUNCTION public.beta_competitive_stat_bounds(
 p_class text
) RETURNS TABLE(hp_cap bigint, atk_cap bigint, def_cap bigint)
LANGUAGE sql IMMUTABLE SET search_path=''
AS $bounds$
 SELECT (c.hp::bigint * 10), (c.atk::bigint * 10), (c.def::bigint * 10)
 FROM (VALUES
   ('Campion'::text,2870,345,243),
   ('Arcaș',1322,281,124),
   ('Paznic',1338,228,162),
   ('Războinic',1262,245,167),
   ('Mag',1264,233,121),
   ('Vraci',1164,287,160),
   ('Gardian',1396,223,217)
 ) AS c(class_name,hp,atk,def)
 WHERE c.class_name=p_class
$bounds$;

-- Dupa verificarea structurala existenta, impunem limitele per clasa.
CREATE OR REPLACE FUNCTION public.beta_competitive_units_within_bounds(
 p_units jsonb
) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $check$
DECLARE
 v_unit jsonb;
 v_bound record;
BEGIN
 IF NOT public.world_units_ok(p_units) THEN RETURN false; END IF;
 FOR v_unit IN SELECT value FROM jsonb_array_elements(p_units) LOOP
   SELECT * INTO v_bound
     FROM public.beta_competitive_stat_bounds(v_unit->>'c');
   IF NOT FOUND THEN RETURN false; END IF;
   IF (v_unit->>'hp')::numeric > v_bound.hp_cap
      OR (v_unit->>'atk')::numeric > v_bound.atk_cap
      OR (v_unit->>'def')::numeric > v_bound.def_cap THEN
     RETURN false;
   END IF;
 END LOOP;
 RETURN true;
END
$check$;

-- Nu transformam automat personaje existente, pentru ca nu stim inca
-- care statistici peste plafon sunt legitime. ABORT inainte de activare.
DO $preflight$
DECLARE
 v_world_bad integer;
 v_throne_bad integer;
BEGIN
 SELECT count(*) INTO v_world_bad
 FROM public.world_players p
 WHERE jsonb_typeof(p.units)='array'
   AND jsonb_array_length(p.units)>0
   AND NOT public.beta_competitive_units_within_bounds(p.units);

 SELECT count(*) INTO v_throne_bad
 FROM public.throne_profiles p
 WHERE p.duel_version=2
   AND NOT public.beta_competitive_units_within_bounds(p.units);

 IF v_world_bad>0 OR v_throne_bad>0 THEN
   RAISE EXCEPTION
     'SQL28 OPRIT fara modificari: % echipe Lume, % aparari Tron ar fi respinse. Verifica datele si plafoanele inainte de activare.',
     v_world_bad,v_throne_bad;
 END IF;
END
$preflight$;

-- Intercepteaza doar PUBLICAREA unei echipe in Lume (colona units).
-- Inserarea initiala a satului fara echipa este permisa ca inainte.
CREATE OR REPLACE FUNCTION public.beta_competitive_world_units_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $worldguard$
BEGIN
 IF NOT public.beta_competitive_units_within_bounds(NEW.units) THEN
   RAISE EXCEPTION 'Statistici PvP peste limitele de siguranta BETA. Verifica echipa si echipamentul.';
 END IF;
 RETURN NEW;
END
$worldguard$;

-- Tron: verificate doar apararile 1v1 versiunea 2.
-- Apararile vechi neconvertite nu sunt sterse sau invalidate retroactiv.
CREATE OR REPLACE FUNCTION public.beta_competitive_throne_units_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $throneguard$
BEGIN
 IF NEW.duel_version=2
    AND (
      jsonb_typeof(NEW.units) IS DISTINCT FROM 'array'
      OR jsonb_array_length(NEW.units)<>1
      OR NOT public.beta_competitive_units_within_bounds(NEW.units)
    ) THEN
   RAISE EXCEPTION 'Statistici ale eroului peste limitele de siguranta BETA Tron.';
 END IF;
 RETURN NEW;
END
$throneguard$;

DROP TRIGGER IF EXISTS beta_competitive_world_units_limits
  ON public.world_players;
CREATE TRIGGER beta_competitive_world_units_limits
  BEFORE UPDATE OF units ON public.world_players
  FOR EACH ROW EXECUTE FUNCTION public.beta_competitive_world_units_guard();

DROP TRIGGER IF EXISTS beta_competitive_throne_units_limits
  ON public.throne_profiles;
CREATE TRIGGER beta_competitive_throne_units_limits
  BEFORE INSERT OR UPDATE OF units ON public.throne_profiles
  FOR EACH ROW EXECUTE FUNCTION public.beta_competitive_throne_units_guard();

REVOKE ALL ON FUNCTION public.beta_competitive_stat_bounds(text),
  public.beta_competitive_units_within_bounds(jsonb),
  public.beta_competitive_world_units_guard(),
  public.beta_competitive_throne_units_guard()
  FROM PUBLIC, anon, authenticated;

COMMIT;

-- Diagnostic READ-ONLY: toate cele 6 coloane trebuie sa fie TRUE.
SELECT
 EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_players'::regclass
      AND tgname='beta_competitive_world_units_limits' AND NOT tgisinternal)
    AS world_guard_active,
 EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.throne_profiles'::regclass
      AND tgname='beta_competitive_throne_units_limits' AND NOT tgisinternal)
    AS throne_guard_active,
 EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_raids'::regclass
      AND tgname='beta_world_shadow_raid_started' AND NOT tgisinternal)
    AS sql22_capture_preserved,
 EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.beta_world_combat_shadow'::regclass
      AND tgname='beta_world_shadow_simulation_created' AND NOT tgisinternal)
    AS sql27_simulator_preserved,
 NOT has_function_privilege('authenticated',
    'public.beta_competitive_units_within_bounds(jsonb)','EXECUTE')
    AS validation_private,
 COALESCE(
   public.beta_competitive_units_within_bounds(
     '[{"n":"test","c":"Campion","hp":287000,"atk":34500,"def":24300}]'::jsonb
   )=false,false
 ) AS impossible_stats_rejected;
