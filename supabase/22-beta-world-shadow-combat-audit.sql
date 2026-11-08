-- Silver Throne BETA · SQL 22 · PAS 33 / etapa 2: observatii paralele pentru luptele PvP din Lume.
-- EXCLUSIV Supabase Silver-Throne-Test -> SQL Editor. NU LIVE.
-- Ruleaza MANUAL dupa SQL 21. Nu schimba castigatorii, cooldownurile, lootul,
-- conturile, salvarile sau functiile existente world_* / throne_* / guild_*.
-- Scop: serverul pastreaza instantaneele ambelor echipe la STARTUL raidului;
-- la incheiere noteaza rezultatul raportat de client si estimeaza avantajul.
-- Estimarea NU este rezultatul luptei reale: motorul browserului foloseste
-- abilitati, critice, vindecari si aleator. NU folositi estimarea la sanctiuni.
-- Statistica publicata este inca din client si NU atesta proprietatea itemelor.

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.world_raids') IS NULL
     OR to_regclass('public.world_players') IS NULL
     OR to_regclass('public.beta_world_result_audit') IS NULL
     OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
    RAISE EXCEPTION 'SQL 22 necesita SQL 02, 07 si 21 instalate in Silver-Throne-Test.';
  END IF;
END $guard$;

CREATE TABLE IF NOT EXISTS public.beta_world_combat_shadow (
  raid_id bigint PRIMARY KEY REFERENCES public.world_raids(id) ON DELETE CASCADE,
  attacker_id uuid NOT NULL,
  defender_id uuid NOT NULL,
  attacker_level integer NOT NULL,
  defender_level integer NOT NULL,
  attacker_units jsonb NOT NULL,
  defender_units jsonb NOT NULL,
  attacker_score numeric,
  defender_score numeric,
  edge_ratio numeric,
  estimate text NOT NULL CHECK (estimate IN
    ('attacker_favored','defender_favored','contested','insufficient_data')),
  reported_win boolean,
  reported_gold integer,
  reported_xp integer,
  finished_at timestamptz,
  started_at timestamptz NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS beta_world_combat_shadow_started_idx
  ON public.beta_world_combat_shadow (started_at DESC);
CREATE INDEX IF NOT EXISTS beta_world_combat_shadow_estimate_idx
  ON public.beta_world_combat_shadow (estimate, started_at DESC);

ALTER TABLE public.beta_world_combat_shadow ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_world_combat_shadow FROM PUBLIC, anon, authenticated;

-- Scor de PRESIUNE, nu simulator de lupta: viata totala *
-- suma max(1, atac individual - apararea medie a echipei adverse).
-- Formula aproximeaza indicatorul existent din UI (vsOdds), dar
-- nu prezice determinist victoria si nu valideaza echipamentul.
CREATE OR REPLACE FUNCTION public.beta_world_shadow_score(
  p_units jsonb, p_opponents jsonb
) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $score$
DECLARE
  v_enemy_def numeric;
  v_hp numeric := 0;
  v_effective numeric := 0;
  v_unit jsonb;
BEGIN
  IF NOT public.world_units_ok(p_units)
     OR NOT public.world_units_ok(p_opponents) THEN
    RETURN NULL;
  END IF;
  SELECT avg((e.unit->>'def')::numeric) INTO v_enemy_def
  FROM jsonb_array_elements(p_opponents) AS e(unit);
  FOR v_unit IN SELECT value FROM jsonb_array_elements(p_units) LOOP
    v_hp := v_hp + (v_unit->>'hp')::numeric;
    v_effective := v_effective
      + greatest(1, (v_unit->>'atk')::numeric - v_enemy_def);
  END LOOP;
  RETURN v_hp * v_effective;
END
$score$;

-- Captura are loc in aceeasi tranzactie in care world_raid_start
-- consuma energia si creeaza world_raids. Jucatorul NU poate trimite
-- prin RPC statistici speciale doar pentru acest audit.
CREATE OR REPLACE FUNCTION public.beta_world_shadow_on_start()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $capture$
DECLARE
  v_a public.world_players%ROWTYPE;
  v_d public.world_players%ROWTYPE;
  v_as numeric;
  v_ds numeric;
  v_ratio numeric;
  v_estimate text := 'insufficient_data';
BEGIN
  SELECT * INTO v_a FROM public.world_players WHERE user_id = NEW.attacker;
  SELECT * INTO v_d FROM public.world_players WHERE user_id = NEW.defender;
  IF NOT FOUND OR v_a.user_id IS NULL THEN
    RAISE EXCEPTION 'Snapshot PvP indisponibil pentru raidul %.', NEW.id;
  END IF;
  v_as := public.beta_world_shadow_score(v_a.units, v_d.units);
  v_ds := public.beta_world_shadow_score(v_d.units, v_a.units);
  IF v_as IS NOT NULL AND v_ds IS NOT NULL AND v_ds > 0 THEN
    v_ratio := round(v_as / v_ds, 6);
    v_estimate := CASE
      WHEN v_ratio >= 1.80 THEN 'attacker_favored'
      WHEN v_ratio <= 0.50 THEN 'defender_favored'
      ELSE 'contested'
    END;
  END IF;

  INSERT INTO public.beta_world_combat_shadow(
    raid_id,attacker_id,defender_id,attacker_level,defender_level,
    attacker_units,defender_units,attacker_score,defender_score,
    edge_ratio,estimate,started_at
  ) VALUES (
    NEW.id,NEW.attacker,NEW.defender,v_a.level,v_d.level,
    v_a.units,v_d.units,v_as,v_ds,v_ratio,v_estimate,NEW.started_at
  ) ON CONFLICT(raid_id) DO NOTHING;
  RETURN NEW;
END
$capture$;

-- Se activeaza si cand un raid expira si world_close_stale il marcheaza
-- drept pierdut: raportul ramane factual, fara a presupune ca browserul
-- a transmis un rezultat. UPDATE-ul nu calculeaza recompense.
CREATE OR REPLACE FUNCTION public.beta_world_shadow_on_finish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $complete$
BEGIN
  IF OLD.finished_at IS NULL AND NEW.finished_at IS NOT NULL THEN
    UPDATE public.beta_world_combat_shadow
      SET reported_win = NEW.win,
          reported_gold = NEW.gold,
          reported_xp = NEW.xp,
          finished_at = NEW.finished_at
    WHERE raid_id = NEW.id AND finished_at IS NULL;
  END IF;
  RETURN NEW;
END
$complete$;

-- Reexecutabil: inlocuirea triggerelor nu sterge observatiile existente.
DROP TRIGGER IF EXISTS beta_world_shadow_raid_started ON public.world_raids;
CREATE TRIGGER beta_world_shadow_raid_started
AFTER INSERT ON public.world_raids
FOR EACH ROW EXECUTE FUNCTION public.beta_world_shadow_on_start();

DROP TRIGGER IF EXISTS beta_world_shadow_raid_finished ON public.world_raids;
CREATE TRIGGER beta_world_shadow_raid_finished
AFTER UPDATE OF finished_at ON public.world_raids
FOR EACH ROW
WHEN (OLD.finished_at IS NULL AND NEW.finished_at IS NOT NULL)
EXECUTE FUNCTION public.beta_world_shadow_on_finish();

REVOKE ALL ON FUNCTION public.beta_world_shadow_score(jsonb,jsonb),
  public.beta_world_shadow_on_start(), public.beta_world_shadow_on_finish()
  FROM PUBLIC, anon, authenticated;

COMMIT;

-- DIAGNOSTIC READ-ONLY: tabelul, RLS si ambele triggere trebuie sa existe.
SELECT
  to_regclass('public.beta_world_combat_shadow') IS NOT NULL AS shadow_table_exists,
  (SELECT relrowsecurity FROM pg_class
    WHERE oid=to_regclass('public.beta_world_combat_shadow')) AS rls_enabled,
  EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_raids'::regclass
      AND tgname='beta_world_shadow_raid_started' AND NOT tgisinternal)
    AS start_trigger_exists,
  EXISTS (SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_raids'::regclass
      AND tgname='beta_world_shadow_raid_finished' AND NOT tgisinternal)
    AS finish_trigger_exists;
