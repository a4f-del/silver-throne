-- Silver Throne · SQL31 / BETA · Pas 33 · audit independent al duelurilor Tronului.
-- Manual DOAR in Supabase Silver-Throne-Test. NICIODATA LIVE.
-- Necesita Tron 1v1 SQL06, protectiile SQL28 si SQL30 instalate.
-- Nu modifica throne_challenge_start / finish, castigatorul, recompensele,
-- echipamentul, inventarul, game_saves sau datele vechi ale jucatorilor.
-- Datele publicate in throne_profiles sunt INCA declarate de browser.
-- Acest audit NU valideaza victoria si NU este simulator de lupta complet.
BEGIN;

DO $prereq$
BEGIN
  IF to_regclass('public.throne_challenges') IS NULL
     OR to_regclass('public.throne_profiles') IS NULL
     OR to_regprocedure('public.throne_challenge_start()') IS NULL
     OR to_regprocedure('public.throne_challenge_finish(bigint,boolean)') IS NULL
     OR to_regprocedure('public.beta_competitive_units_within_bounds(jsonb)') IS NULL
     OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
    RAISE EXCEPTION 'SQL31 necesita Tron 1v1 (SQL06) si protectiile BETA SQL28/30.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('throne_challenges','id'),
      ('throne_challenges','user_id'),
      ('throne_challenges','holder_at_start'),
      ('throne_challenges','started_at'),
      ('throne_challenges','finished'),
      ('throne_profiles','user_id'),
      ('throne_profiles','units'),
      ('throne_profiles','level'),
      ('throne_profiles','duel_version')
    ) AS needed(table_name,column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public'
        AND c.table_name=needed.table_name
        AND c.column_name=needed.column_name
    )
  ) THEN
    RAISE EXCEPTION 'SQL31: schema Tronului este diferita; nu instalez auditul fara verificare.';
  END IF;
END
$prereq$;

-- Doar provocari NOI, pornite dupa instalare.
-- ON DELETE CASCADE pastreaza stergerea contului/provocarilor functionala.
CREATE TABLE IF NOT EXISTS public.beta_throne_challenge_shadow (
  challenge_id bigint PRIMARY KEY
    REFERENCES public.throne_challenges(id) ON DELETE CASCADE,
  challenger_id uuid NOT NULL,
  holder_id uuid,
  challenger_level integer,
  holder_level integer,
  challenger_units jsonb,
  holder_units jsonb,
  challenger_score numeric,
  holder_score numeric,
  estimate text NOT NULL DEFAULT 'insufficient_data'
    CHECK (estimate IN (
      'challenger_favored','holder_favored','contested',
      'royal_guard','insufficient_data'
    )),
  reported_win boolean,
  result_field text,
  challenge_started_at timestamptz NOT NULL,
  completed_at timestamptz,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beta_throne_challenge_shadow_started_idx
  ON public.beta_throne_challenge_shadow(challenge_started_at DESC);
ALTER TABLE public.beta_throne_challenge_shadow ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_throne_challenge_shadow
  FROM PUBLIC, anon, authenticated;

-- In aceeasi tranzactie cu throne_challenge_start, salvam instantaneul
-- ambilor eroi asa cum era in profilele deja publicate pe server.
-- Nu acceptam in aceasta functie date trimise direct de browser.
-- Modelul orientativ nu include critice, abilitati, random, regenerare
-- sau cap-ul pe lovitura de 38% din viata maxima; nu decide nimic.
CREATE OR REPLACE FUNCTION public.beta_throne_shadow_on_start()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $start$
DECLARE
  v_a_units jsonb;
  v_h_units jsonb;
  v_a_lvl integer;
  v_h_lvl integer;
  v_a_ver integer;
  v_h_ver integer;
  v_a jsonb;
  v_h jsonb;
  v_a_score numeric;
  v_h_score numeric;
  v_ratio numeric;
  v_est text := 'insufficient_data';
BEGIN
  SELECT units,level,duel_version
    INTO v_a_units,v_a_lvl,v_a_ver
  FROM public.throne_profiles WHERE user_id=NEW.user_id;

  IF NEW.holder_at_start IS NULL THEN
    v_est := 'royal_guard';
  ELSE
    SELECT units,level,duel_version
      INTO v_h_units,v_h_lvl,v_h_ver
    FROM public.throne_profiles WHERE user_id=NEW.holder_at_start;

    -- Verificam forma inainte de orice citire a unitatii individuale.
    IF v_a_ver=2 AND v_h_ver=2
       AND jsonb_typeof(v_a_units)='array'
       AND jsonb_typeof(v_h_units)='array' THEN
      IF jsonb_array_length(v_a_units)=1
         AND jsonb_array_length(v_h_units)=1
         AND public.beta_competitive_units_within_bounds(v_a_units)
         AND public.beta_competitive_units_within_bounds(v_h_units) THEN
        v_a := v_a_units->0;
        v_h := v_h_units->0;
        v_a_score := (v_a->>'hp')::numeric * greatest(
          1,round((v_a->>'atk')::numeric*1.62)
            -round((v_h->>'def')::numeric*0.35));
        v_h_score := (v_h->>'hp')::numeric * greatest(
          1,round((v_h->>'atk')::numeric*1.62)
            -round((v_a->>'def')::numeric*0.35));
        IF v_h_score>0 THEN
          v_ratio := v_a_score/v_h_score;
          v_est := CASE
            WHEN v_ratio>=1.80 THEN 'challenger_favored'
            WHEN v_ratio<=0.55 THEN 'holder_favored'
            ELSE 'contested'
          END;
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.beta_throne_challenge_shadow(
    challenge_id,challenger_id,holder_id,challenger_level,holder_level,
    challenger_units,holder_units,challenger_score,holder_score,
    estimate,challenge_started_at
  ) VALUES (
    NEW.id,NEW.user_id,NEW.holder_at_start,v_a_lvl,v_h_lvl,
    v_a_units,v_h_units,v_a_score,v_h_score,
    v_est,NEW.started_at
  ) ON CONFLICT(challenge_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Instrumentarea nu trebuie sa refuze un duel legitim si nici sa modifice
  -- rezultatul original, inclusiv atunci cand schema s-ar schimba in viitor.
  RAISE WARNING 'SQL31 audit Tron la start, challenge %: %',NEW.id,SQLERRM;
  RETURN NEW;
END
$start$;

-- Citim DOAR campurile deja scrise de functia originala de finalizare.
-- Compatibil cu scheme care denumesc indicatorul win, won sau victory.
-- Daca verdictul nu se afla in tabela, il lasam NULL, nu inventam rezultat.
CREATE OR REPLACE FUNCTION public.beta_throne_shadow_on_finish()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $finish$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_key text;
  v_report boolean;
BEGIN
  v_key := CASE
    WHEN v_row->>'win' IN ('true','false') THEN 'win'
    WHEN v_row->>'won' IN ('true','false') THEN 'won'
    WHEN v_row->>'victory' IN ('true','false') THEN 'victory'
    ELSE NULL
  END;
  IF v_key IS NOT NULL THEN
    v_report := (v_row->>v_key)::boolean;
  END IF;
  UPDATE public.beta_throne_challenge_shadow
  SET reported_win=v_report,
      result_field=coalesce(v_key,'unavailable'),
      completed_at=now()
  WHERE challenge_id=NEW.id AND completed_at IS NULL;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'SQL31 audit Tron la finish, challenge %: %',NEW.id,SQLERRM;
  RETURN NEW;
END
$finish$;

DROP TRIGGER IF EXISTS beta_throne_shadow_challenge_started
  ON public.throne_challenges;
CREATE TRIGGER beta_throne_shadow_challenge_started
AFTER INSERT ON public.throne_challenges
FOR EACH ROW EXECUTE FUNCTION public.beta_throne_shadow_on_start();

DROP TRIGGER IF EXISTS beta_throne_shadow_challenge_finished
  ON public.throne_challenges;
CREATE TRIGGER beta_throne_shadow_challenge_finished
AFTER UPDATE OF finished ON public.throne_challenges
FOR EACH ROW
WHEN (OLD.finished IS DISTINCT FROM TRUE AND NEW.finished IS TRUE)
EXECUTE FUNCTION public.beta_throne_shadow_on_finish();

REVOKE ALL ON FUNCTION public.beta_throne_shadow_on_start(),
  public.beta_throne_shadow_on_finish()
  FROM PUBLIC, anon, authenticated;
COMMIT;

-- DIAGNOSTIC read-only: toate cele 8 rezultate trebuie sa fie TRUE.
SELECT
 to_regclass('public.beta_throne_challenge_shadow') IS NOT NULL
   AS throne_shadow_exists,
 coalesce((SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_throne_challenge_shadow')),false)
   AS shadow_rls_enabled,
 NOT has_table_privilege('authenticated',
   'public.beta_throne_challenge_shadow','SELECT')
   AS shadow_not_readable_by_clients,
 EXISTS(SELECT 1 FROM pg_trigger WHERE
   tgrelid='public.throne_challenges'::regclass
   AND tgname='beta_throne_shadow_challenge_started'
   AND NOT tgisinternal AND tgenabled<>'D')
   AS throne_start_capture_active,
 EXISTS(SELECT 1 FROM pg_trigger WHERE
   tgrelid='public.throne_challenges'::regclass
   AND tgname='beta_throne_shadow_challenge_finished'
   AND NOT tgisinternal AND tgenabled<>'D')
   AS throne_finish_capture_active,
 NOT has_function_privilege('authenticated',
   'public.beta_throne_shadow_on_start()','EXECUTE')
   AS capture_functions_private,
 EXISTS(SELECT 1 FROM pg_trigger WHERE
   tgrelid='public.throne_profiles'::regclass
   AND tgname='beta_competitive_throne_units_limits'
   AND NOT tgisinternal AND tgenabled<>'D')
   AS sql28_throne_guard_preserved,
 to_regprocedure('public.throne_challenge_start()') IS NOT NULL
   AND to_regprocedure('public.throne_challenge_finish(bigint,boolean)') IS NOT NULL
   AS original_throne_rpcs_preserved;
