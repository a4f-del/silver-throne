-- Silver Throne · SQL 23 · PAS 33 / BETA · audit pasiv pentru progres si inventar.
-- Ruleaza MANUAL NUMAI in Supabase Silver-Throne-Test. NU LIVE.
-- Necesita salvarea game_saves, accesul BETA din SQL 07 si SQL 21/22.
-- Nu modifica si nu valideaza autoritativ progresul: game_data este inca din browser.
-- Nu sterge, nu reseteaza si NU blocheaza salvari, recompense sau jucatori.
-- Indicatorii sunt pentru investigatii tehnice, NU pentru sanctiuni automate.
BEGIN;

DO $guard$
BEGIN
 IF to_regclass('public.game_saves') IS NULL
    OR to_regclass('public.beta_admins') IS NULL
    OR to_regclass('public.beta_world_result_audit') IS NULL
    OR to_regclass('public.beta_world_combat_shadow') IS NULL THEN
   RAISE EXCEPTION 'SQL23 necesita game_saves si migrarile BETA SQL07, SQL21, SQL22.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='game_saves'
     AND column_name='game_data'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='game_saves'
     AND column_name='user_id'
 ) THEN
   RAISE EXCEPTION 'game_saves trebuie sa contina user_id si game_data.';
 END IF;
END
$guard$;

-- Un singur rezumat pe cont, fara copii ale salvarii sau nume de obiecte.
-- Amprentele MD5 semnaleaza doar schimbari: NU sunt semnaturi sau dovada.
CREATE TABLE IF NOT EXISTS public.beta_save_progress_audit (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  observed_changes bigint NOT NULL DEFAULT 0,
  flagged_changes bigint NOT NULL DEFAULT 0,
  level_value numeric,
  xp_value numeric,
  gold_value numeric,
  ore_value numeric,
  inventory_count integer,
  party_count integer,
  reserves_count integer,
  inventory_fingerprint text,
  roster_fingerprint text,
  last_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_anomaly_flags text[] NOT NULL DEFAULT ARRAY[]::text[],
  last_anomaly_at timestamptz,
  observed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_save_progress_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_save_progress_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.beta_save_progress_track()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $audit$
DECLARE
  v_new jsonb;
  v_old jsonb;
  v_level numeric;
  v_xp numeric;
  v_gold numeric;
  v_ore numeric;
  v_old_level numeric;
  v_old_gold numeric;
  v_old_xp numeric;
  v_old_ore numeric;
  v_inv integer;
  v_party integer;
  v_reserves integer;
  v_flags text[] := ARRAY[]::text[];
  v_inv_hash text;
  v_roster_hash text;
BEGIN
  -- Auditul nu are voie sa opreasca salvarea jocului, chiar daca apare
  -- o eroare la capturare. Eroarea este vizibila in logul PostgreSQL.
  BEGIN
    v_new := NEW.game_data::jsonb;
    IF TG_OP = 'UPDATE' THEN
      v_old := OLD.game_data::jsonb;
      IF NEW.game_data IS NOT DISTINCT FROM OLD.game_data THEN RETURN NEW; END IF;
    END IF;

    IF jsonb_typeof(v_new) IS DISTINCT FROM 'object' THEN
      v_flags := array_append(v_flags,'invalid_save_root');
    END IF;

    IF jsonb_typeof(v_new->'lvl') = 'number' THEN
      v_level := (v_new->>'lvl')::numeric;
    ELSE
      v_flags := array_append(v_flags,'invalid_level');
    END IF;
    IF jsonb_typeof(v_new->'xp') = 'number' THEN
      v_xp := (v_new->>'xp')::numeric;
    ELSE
      v_flags := array_append(v_flags,'invalid_xp');
    END IF;
    IF jsonb_typeof(v_new->'gold') = 'number' THEN
      v_gold := (v_new->>'gold')::numeric;
    ELSE
      v_flags := array_append(v_flags,'invalid_gold');
    END IF;
    IF jsonb_typeof(v_new->'ore') = 'number' THEN
      v_ore := (v_new->>'ore')::numeric;
    ELSE
      v_flags := array_append(v_flags,'invalid_ore');
    END IF;

    IF v_level IS NOT NULL AND (v_level < 1 OR v_level > 500 OR v_level <> trunc(v_level)) THEN
      v_flags := array_append(v_flags,'level_outside_expected_range');
    END IF;
    IF v_xp IS NOT NULL AND v_xp < 0 THEN
      v_flags := array_append(v_flags,'negative_xp');
    END IF;
    IF v_gold IS NOT NULL AND v_gold < 0 THEN
      v_flags := array_append(v_flags,'negative_gold');
    END IF;
    IF v_ore IS NOT NULL AND v_ore < 0 THEN
      v_flags := array_append(v_flags,'negative_ore');
    END IF;

    IF jsonb_typeof(v_new->'inv') = 'array' THEN
      v_inv := jsonb_array_length(v_new->'inv');
      IF v_inv > 5000 THEN v_flags := array_append(v_flags,'large_inventory'); END IF;
    ELSE
      v_flags := array_append(v_flags,'invalid_inventory');
    END IF;
    IF jsonb_typeof(v_new->'fs') = 'array' THEN
      v_party := jsonb_array_length(v_new->'fs');
      IF v_party < 1 OR v_party > 10 THEN
        v_flags := array_append(v_flags,'unusual_party_size');
      END IF;
    ELSE
      v_flags := array_append(v_flags,'invalid_party');
    END IF;
    IF jsonb_typeof(v_new->'rs') = 'array' THEN
      v_reserves := jsonb_array_length(v_new->'rs');
    END IF;

    IF v_old IS NOT NULL THEN
      IF jsonb_typeof(v_old->'lvl') = 'number' THEN
        v_old_level := (v_old->>'lvl')::numeric;
      END IF;
      IF jsonb_typeof(v_old->'xp') = 'number' THEN
        v_old_xp := (v_old->>'xp')::numeric;
      END IF;
      IF jsonb_typeof(v_old->'gold') = 'number' THEN
        v_old_gold := (v_old->>'gold')::numeric;
      END IF;
      IF jsonb_typeof(v_old->'ore') = 'number' THEN
        v_old_ore := (v_old->>'ore')::numeric;
      END IF;
      -- Praguri deliberat mari. Pot aparea si din importuri sau restaurari.
      IF v_level IS NOT NULL AND v_old_level IS NOT NULL
         AND v_level - v_old_level > 10 THEN
        v_flags := array_append(v_flags,'large_level_increase');
      END IF;
      IF v_gold IS NOT NULL AND v_old_gold IS NOT NULL
         AND v_gold - v_old_gold > 2000000 THEN
        v_flags := array_append(v_flags,'large_gold_increase');
      END IF;
      IF v_ore IS NOT NULL AND v_old_ore IS NOT NULL
         AND v_ore - v_old_ore > 100000 THEN
        v_flags := array_append(v_flags,'large_ore_increase');
      END IF;
      IF v_xp IS NOT NULL AND v_old_xp IS NOT NULL
         AND v_xp - v_old_xp > 2000000 THEN
        v_flags := array_append(v_flags,'large_xp_increase');
      END IF;
      IF v_inv IS NOT NULL AND jsonb_typeof(v_old->'inv') = 'array'
         AND v_inv - jsonb_array_length(v_old->'inv') > 250 THEN
        v_flags := array_append(v_flags,'large_inventory_increase');
      END IF;
    END IF;

    v_inv_hash := md5(coalesce(v_new->'inv','null'::jsonb)::text);
    v_roster_hash := md5(pg_catalog.jsonb_build_object(
      'fs',v_new->'fs','rs',v_new->'rs')::text);

    INSERT INTO public.beta_save_progress_audit(
      user_id,observed_changes,flagged_changes,
      level_value,xp_value,gold_value,ore_value,
      inventory_count,party_count,reserves_count,
      inventory_fingerprint,roster_fingerprint,
      last_flags,last_anomaly_flags,last_anomaly_at,observed_at
    ) VALUES (
      NEW.user_id,1,CASE WHEN cardinality(v_flags)>0 THEN 1 ELSE 0 END,
      v_level,v_xp,v_gold,v_ore,
      v_inv,v_party,v_reserves,
      v_inv_hash,v_roster_hash,
      v_flags,v_flags,
      CASE WHEN cardinality(v_flags)>0 THEN now() ELSE NULL END,now()
    )
    ON CONFLICT(user_id) DO UPDATE SET
      observed_changes = public.beta_save_progress_audit.observed_changes + 1,
      flagged_changes = public.beta_save_progress_audit.flagged_changes +
        CASE WHEN cardinality(EXCLUDED.last_flags)>0 THEN 1 ELSE 0 END,
      level_value = EXCLUDED.level_value,
      xp_value = EXCLUDED.xp_value,
      gold_value = EXCLUDED.gold_value,
      ore_value = EXCLUDED.ore_value,
      inventory_count = EXCLUDED.inventory_count,
      party_count = EXCLUDED.party_count,
      reserves_count = EXCLUDED.reserves_count,
      inventory_fingerprint = EXCLUDED.inventory_fingerprint,
      roster_fingerprint = EXCLUDED.roster_fingerprint,
      last_flags = EXCLUDED.last_flags,
      last_anomaly_flags = CASE WHEN cardinality(EXCLUDED.last_flags)>0
        THEN EXCLUDED.last_flags
        ELSE public.beta_save_progress_audit.last_anomaly_flags END,
      last_anomaly_at = CASE WHEN cardinality(EXCLUDED.last_flags)>0
        THEN now()
        ELSE public.beta_save_progress_audit.last_anomaly_at END,
      observed_at = now();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'SQL23 BETA audit skipped for user %: %', NEW.user_id, SQLERRM;
  END;
  RETURN NEW;
END
$audit$;

DROP TRIGGER IF EXISTS beta_save_progress_change ON public.game_saves;
CREATE TRIGGER beta_save_progress_change
AFTER INSERT OR UPDATE OF game_data ON public.game_saves
FOR EACH ROW EXECUTE FUNCTION public.beta_save_progress_track();

REVOKE ALL ON FUNCTION public.beta_save_progress_track()
  FROM PUBLIC, anon, authenticated;
COMMIT;

-- Doar verificari read-only. Toate cele trei valori trebuie sa fie true.
SELECT
  to_regclass('public.beta_save_progress_audit') IS NOT NULL AS audit_table_exists,
  (SELECT relrowsecurity FROM pg_class
   WHERE oid = to_regclass('public.beta_save_progress_audit')) AS rls_enabled,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.game_saves'::regclass
      AND tgname='beta_save_progress_change'
      AND NOT tgisinternal
  ) AS save_trigger_exists;
