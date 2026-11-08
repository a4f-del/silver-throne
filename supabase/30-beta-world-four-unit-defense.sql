-- Silver Throne · SQL30 / BETA · 4 aparatori in Lume + sincronizare statistici.
-- Executa MANUAL numai pe Supabase Silver-Throne-Test, NICIODATA LIVE.
-- Necesita SQL21, SQL22, SQL27 si SQL28 (limitele per clasa) instalate.
-- Nu modifica RPC-urile world_join, world_raid_start, world_raid_finish,
-- throne_publish sau politicile pentru aur/XP. SQL29 este independent.
-- Lumea: erou + pana la 3 mercenari (4 in total de la nivelul 30).
-- Tronul ramane duel 1v1; actualizarile automate sunt realizate in JS.
-- Fara reseturi, stergeri si fara recalcularea raidurilor deja incheiate.
BEGIN;

DO $prereq$
DECLARE
 v_bad integer;
BEGIN
 IF to_regclass('public.world_players') IS NULL
    OR to_regclass('public.beta_world_combat_shadow') IS NULL
    OR to_regclass('public.beta_world_combat_simulations') IS NULL
    OR to_regprocedure('public.world_units_ok(jsonb)') IS NULL
    OR to_regprocedure('public.beta_competitive_units_within_bounds(jsonb)') IS NULL
    OR to_regprocedure('public.beta_world_combat_shadow_simulate(jsonb,jsonb,bigint)') IS NULL THEN
    RAISE EXCEPTION 'SQL30 necesita SQL21/22/27 si SQL28 instalate in BETA. Ruleaza SQL28 mai intai.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_players'::regclass
     AND tgname='beta_competitive_world_units_limits'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) THEN
   RAISE EXCEPTION 'SQL30 necesita triggerul de limite pe clase din SQL28 activ.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_constraint
   WHERE conrelid='public.beta_world_combat_simulations'::regclass
     AND conname='beta_world_combat_simulations_actions_count_check'
 ) THEN
   RAISE EXCEPTION 'SQL30: constrangerea simulatorului este diferita de versiunea SQL27; nu se modifica automat.';
 END IF;
 -- Datele existente sunt compatibile cu pragul anterior (max 3).
 -- Refuza instalarea daca exista profiluri deja incompatibile cu nivelul.
 SELECT count(*) INTO v_bad FROM public.world_players w
 WHERE jsonb_typeof(w.units)='array'
   AND jsonb_array_length(w.units)>0
   AND jsonb_array_length(w.units)>
     (CASE WHEN w.level>=30 THEN 4 ELSE 3 END);
 IF v_bad>0 THEN
   RAISE EXCEPTION 'SQL30 preflight: % profiluri Lume depasesc limita de echipa pentru nivelul lor. Nicio modificare aplicata.',v_bad;
 END IF;
END
$prereq$;

-- Actualizam DOAR validatorul de echipa comun; Tronul BETA cere explicit
-- in continuare exact UN erou in throne_publish si triggerul SQL28.
CREATE OR REPLACE FUNCTION public.world_units_ok(p_units jsonb)
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $units$
DECLARE
 v_unit jsonb;
BEGIN
 IF p_units IS NULL OR jsonb_typeof(p_units) IS DISTINCT FROM 'array'
   OR jsonb_array_length(p_units)<1 OR jsonb_array_length(p_units)>4 THEN
    RETURN false;
 END IF;
 FOR v_unit IN SELECT value FROM jsonb_array_elements(p_units) LOOP
   IF jsonb_typeof(v_unit) IS DISTINCT FROM 'object'
      OR coalesce(v_unit->>'c','') NOT IN
        ('Campion','Arcaș','Paznic','Războinic','Mag','Vraci','Gardian')
      OR jsonb_typeof(v_unit->'hp') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_unit->'atk') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_unit->'def') IS DISTINCT FROM 'number'
      OR (v_unit->>'hp')::numeric<=0 OR (v_unit->>'hp')::numeric>1000000
      OR (v_unit->>'atk')::numeric<0 OR (v_unit->>'atk')::numeric>1000000
      OR (v_unit->>'def')::numeric<0 OR (v_unit->>'def')::numeric>1000000 THEN
     RETURN false;
   END IF;
 END LOOP;
 RETURN true;
END
$units$;

-- Nivelul minim pentru slotul al patrulea este 30, exact ca in TMAX().
-- Acest trigger nu introduce echipe obligatorii de patru luptatori.
CREATE OR REPLACE FUNCTION public.beta_world_team_size_by_level_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $size$
BEGIN
 IF jsonb_typeof(NEW.units) IS DISTINCT FROM 'array'
    OR jsonb_array_length(NEW.units)<1
    OR jsonb_array_length(NEW.units)>
       CASE WHEN NEW.level>=30 THEN 4 ELSE 3 END THEN
    RAISE EXCEPTION 'Apărarea satului: maxim % luptători pentru nivelul %.',
      CASE WHEN NEW.level>=30 THEN 4 ELSE 3 END, NEW.level;
 END IF;
 RETURN NEW;
END
$size$;

DROP TRIGGER IF EXISTS beta_world_team_size_by_level
  ON public.world_players;
CREATE TRIGGER beta_world_team_size_by_level
BEFORE UPDATE OF units, level ON public.world_players
FOR EACH ROW EXECUTE FUNCTION public.beta_world_team_size_by_level_guard();

-- SQL27 simuleaza deja fiecare unitate din array, dar limita de actiuni
-- a fost proiectata pentru 3v3 (max 240). Cu 4v4 sunt max 320.
ALTER TABLE public.beta_world_combat_simulations
  DROP CONSTRAINT IF EXISTS beta_world_combat_simulations_actions_count_check;
ALTER TABLE public.beta_world_combat_simulations
  ADD CONSTRAINT beta_world_combat_simulations_actions_count_check
  CHECK (actions_count BETWEEN 0 AND 320);

REVOKE ALL ON FUNCTION public.world_units_ok(jsonb),
  public.beta_world_team_size_by_level_guard()
  FROM PUBLIC, anon, authenticated;
-- Functiile SECURITY DEFINER existente continua sa le poata apela.
COMMIT;

-- DIAGNOSTIC read-only: toate cele 7 rezultate trebuie sa fie true.
SELECT
 public.world_units_ok(
   '[{"c":"Campion","hp":200,"atk":50,"def":20},{"c":"Paznic","hp":150,"atk":30,"def":20},{"c":"Mag","hp":90,"atk":45,"def":10},{"c":"Vraci","hp":100,"atk":25,"def":15}]'::jsonb
 ) AS world_accepts_four_units,
 NOT public.world_units_ok(
   '[{"c":"Campion","hp":1,"atk":1,"def":1},{"c":"Paznic","hp":1,"atk":1,"def":1},{"c":"Mag","hp":1,"atk":1,"def":1},{"c":"Vraci","hp":1,"atk":1,"def":1},{"c":"Arcaș","hp":1,"atk":1,"def":1}]'::jsonb
 ) AS world_rejects_five_units,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_players'::regclass
   AND tgname='beta_world_team_size_by_level'
   AND NOT tgisinternal AND tgenabled<>'D'
 ) AS level_30_slot_guard_active,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_players'::regclass
   AND tgname='beta_competitive_world_units_limits'
   AND NOT tgisinternal AND tgenabled<>'D'
 ) AS sql28_class_limits_preserved,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.beta_world_combat_shadow'::regclass
   AND tgname='beta_world_shadow_simulation_created'
   AND NOT tgisinternal AND tgenabled<>'D'
 ) AS sql27_simulator_preserved,
 EXISTS(SELECT 1 FROM pg_constraint
   WHERE conrelid='public.beta_world_combat_simulations'::regclass
     AND conname='beta_world_combat_simulations_actions_count_check'
     AND pg_get_constraintdef(oid) LIKE '%320%'
 ) AS simulator_four_unit_limit,
 NOT has_function_privilege('authenticated',
   'public.beta_world_team_size_by_level_guard()','EXECUTE')
 AS level_guard_private;
