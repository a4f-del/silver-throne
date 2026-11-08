-- Silver Throne · SQL32 / BETA · Pas 33 · simulare pasiva duel Tron 1v1.
-- Ruleaza MANUAL doar in Supabase Silver-Throne-Test, dupa SQL31 (8/8 true).
-- NU LIVE. NU schimba castigatorul, duelurile sau recompensele si NU face reset.
--
-- Model BASELINE, NU motor oficial: normal hit (ATK - 35% DEF), multiplicator
-- de fantoma 1.62 NUMAI pentru apararea regelui, cap 38% HP per lovitura.
-- Initiativa este determinista din ID-ul provocarii doar pentru audit,
-- pe cand duelul real foloseste RNG. Nu include critice, abilitati,
-- sangerare, vindecare, afixe, trasaturi, echipament verificat server-side.
-- Simularea nu este dovada de trisare si nu trebuie folosita la ban/premii.

BEGIN;

DO $prereq$
BEGIN
  IF to_regclass('public.beta_throne_challenge_shadow') IS NULL
    OR to_regclass('public.throne_challenges') IS NULL
    OR to_regprocedure('public.beta_competitive_units_within_bounds(jsonb)') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
    RAISE EXCEPTION 'SQL32 necesita SQL31 instalat in Supabase BETA. Nu modifica LIVE.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.throne_challenges'::regclass
      AND tgname='beta_throne_shadow_challenge_started'
      AND NOT tgisinternal AND tgenabled<>'D'
  ) THEN
    RAISE EXCEPTION 'SQL32 necesita triggerul de snapshot Tron SQL31 activ.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='beta_throne_challenge_shadow'
      AND column_name='challenge_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='beta_throne_challenge_shadow'
      AND column_name='challenger_units'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='beta_throne_challenge_shadow'
      AND column_name='holder_units'
  ) THEN
    RAISE EXCEPTION 'SQL32: structura SQL31 nu corespunde; opresc fara modificari.';
  END IF;
END
$prereq$;

CREATE TABLE IF NOT EXISTS public.beta_throne_duel_simulations (
  challenge_id bigint PRIMARY KEY
    REFERENCES public.beta_throne_challenge_shadow(challenge_id) ON DELETE CASCADE,
  engine_version integer NOT NULL DEFAULT 1 CHECK(engine_version=1),
  outcome text NOT NULL CHECK(outcome IN (
    'challenger','holder','draw','unavailable'
  )),
  predicted_challenger_win boolean,
  rounds integer NOT NULL DEFAULT 0 CHECK(rounds BETWEEN 0 AND 60),
  actions_count integer NOT NULL DEFAULT 0 CHECK(actions_count BETWEEN 0 AND 120),
  challenger_hp_left bigint NOT NULL DEFAULT 0 CHECK(challenger_hp_left>=0),
  holder_hp_left bigint NOT NULL DEFAULT 0 CHECK(holder_hp_left>=0),
  challenger_snapshot_md5 text,
  holder_snapshot_md5 text,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.beta_throne_duel_simulations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_throne_duel_simulations
  FROM PUBLIC, anon, authenticated;

-- Functie PURA: inputul poate proveni NUMAI din snapshoturile deja
-- publicate, si doar triggerul intern o apeleaza in fluxul normal.
-- Nu folosim parametrul v_win din browser, care ajunge abia la finish.
CREATE OR REPLACE FUNCTION public.beta_throne_duel_simulate_baseline(
  p_challenger jsonb, p_holder jsonb, p_challenge_id bigint
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $sim$
DECLARE
  v_a jsonb;
  v_h jsonb;
  v_a_max bigint;
  v_h_max bigint;
  v_a_hp bigint;
  v_h_hp bigint;
  v_a_atk bigint;
  v_h_atk bigint;
  v_a_def bigint;
  v_h_def bigint;
  v_a_cap bigint;
  v_h_cap bigint;
  v_dmg bigint;
  v_round integer;
  v_rounds integer := 0;
  v_phase integer;
  v_actions integer := 0;
  v_challenger_first boolean;
  v_challenger_turn boolean;
  v_outcome text := 'draw';
BEGIN
  -- Nu simulam Garda Regala: pentru ea nu exista erou cu stats
  -- in throne_profiles, iar un verdict ar fi inventat.
  IF p_challenge_id IS NULL OR p_challenge_id<=0
     OR p_challenger IS NULL OR p_holder IS NULL THEN
    RETURN jsonb_build_object(
      'outcome','unavailable','predicted_win',null,'rounds',0,'actions',0,
      'challenger_hp_left',0,'holder_hp_left',0);
  END IF;
  IF jsonb_typeof(p_challenger) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_holder) IS DISTINCT FROM 'array' THEN
    RETURN jsonb_build_object(
      'outcome','unavailable','predicted_win',null,'rounds',0,'actions',0,
      'challenger_hp_left',0,'holder_hp_left',0);
  END IF;
  IF jsonb_array_length(p_challenger)<>1
     OR jsonb_array_length(p_holder)<>1
     OR NOT public.beta_competitive_units_within_bounds(p_challenger)
     OR NOT public.beta_competitive_units_within_bounds(p_holder) THEN
    RETURN jsonb_build_object(
      'outcome','unavailable','predicted_win',null,'rounds',0,'actions',0,
      'challenger_hp_left',0,'holder_hp_left',0);
  END IF;

  v_a:=p_challenger->0;
  v_h:=p_holder->0;
  v_a_max:=greatest(1,round((v_a->>'hp')::numeric)::bigint);
  v_h_max:=greatest(1,round((v_h->>'hp')::numeric)::bigint);
  v_a_hp:=v_a_max;
  v_h_hp:=v_h_max;
  v_a_atk:=greatest(1,round((v_a->>'atk')::numeric)::bigint);
  v_h_atk:=greatest(1,round((v_h->>'atk')::numeric*1.62)::bigint);
  v_a_def:=greatest(0,round((v_a->>'def')::numeric)::bigint);
  v_h_def:=greatest(0,round((v_h->>'def')::numeric)::bigint);
  v_a_cap:=greatest(1,ceil(v_a_max::numeric*0.38)::bigint);
  v_h_cap:=greatest(1,ceil(v_h_max::numeric*0.38)::bigint);

  -- In joc, prioritatea reala poate fi aleatoare. Aici alternam
  -- pe baza paritatii ID-ului pentru rezultate REPRODUCTIBILE,
  -- nu pentru a pretinde ca recream initiativa originala.
  v_challenger_first:=(mod(p_challenge_id,2)=0);
  FOR v_round IN 1..60 LOOP
    v_rounds:=v_round;
    FOR v_phase IN 1..2 LOOP
      v_challenger_turn:=(v_phase=1 AND v_challenger_first)
                      OR (v_phase=2 AND NOT v_challenger_first);
      IF v_challenger_turn THEN
        v_dmg:=least(v_h_cap,greatest(1,round(
          v_a_atk::numeric-v_h_def::numeric*0.35)::bigint));
        v_h_hp:=greatest(0,v_h_hp-v_dmg);
      ELSE
        v_dmg:=least(v_a_cap,greatest(1,round(
          v_h_atk::numeric-v_a_def::numeric*0.35)::bigint));
        v_a_hp:=greatest(0,v_a_hp-v_dmg);
      END IF;
      v_actions:=v_actions+1;
      EXIT WHEN v_a_hp=0 OR v_h_hp=0;
    END LOOP;
    EXIT WHEN v_a_hp=0 OR v_h_hp=0;
  END LOOP;
  v_outcome:=CASE
    WHEN v_a_hp>0 AND v_h_hp=0 THEN 'challenger'
    WHEN v_h_hp>0 AND v_a_hp=0 THEN 'holder'
    ELSE 'draw'
  END;
  RETURN jsonb_build_object(
    'outcome',v_outcome,
    'predicted_win',CASE WHEN v_outcome='draw' THEN NULL
      ELSE v_outcome='challenger' END,
    'rounds',v_rounds,'actions',v_actions,
    'challenger_hp_left',v_a_hp,'holder_hp_left',v_h_hp);
END
$sim$;

-- Instalarea nu simuleaza retroactiv duelurile existente si nu sterge
-- observatiile SQL31. Doar noile snapshoturi declanseaza acest trigger.
CREATE OR REPLACE FUNCTION public.beta_throne_duel_shadow_auto()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $auto$
DECLARE
  v_result jsonb;
BEGIN
  BEGIN
    v_result:=public.beta_throne_duel_simulate_baseline(
      NEW.challenger_units,NEW.holder_units,NEW.challenge_id);
    INSERT INTO public.beta_throne_duel_simulations(
      challenge_id,outcome,predicted_challenger_win,rounds,actions_count,
      challenger_hp_left,holder_hp_left,
      challenger_snapshot_md5,holder_snapshot_md5
    ) VALUES (
      NEW.challenge_id,v_result->>'outcome',
      (v_result->>'predicted_win')::boolean,
      (v_result->>'rounds')::integer,
      (v_result->>'actions')::integer,
      (v_result->>'challenger_hp_left')::bigint,
      (v_result->>'holder_hp_left')::bigint,
      md5(coalesce(NEW.challenger_units::text,'null')),
      md5(coalesce(NEW.holder_units::text,'null'))
    ) ON CONFLICT(challenge_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'SQL32 simulator pasiv Tron challenge %: %',
      NEW.challenge_id,SQLERRM;
  END;
  RETURN NEW;
END
$auto$;

DROP TRIGGER IF EXISTS beta_throne_duel_simulation_created
  ON public.beta_throne_challenge_shadow;
CREATE TRIGGER beta_throne_duel_simulation_created
AFTER INSERT ON public.beta_throne_challenge_shadow
FOR EACH ROW EXECUTE FUNCTION public.beta_throne_duel_shadow_auto();

REVOKE ALL ON FUNCTION public.beta_throne_duel_simulate_baseline(
  jsonb,jsonb,bigint
), public.beta_throne_duel_shadow_auto()
  FROM PUBLIC, anon, authenticated;

COMMIT;

-- DIAGNOSTIC: toate cele 8 verificari trebuie sa fie true.
SELECT
 to_regclass('public.beta_throne_duel_simulations') IS NOT NULL
   AS throne_simulations_table_exists,
 coalesce((SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_throne_duel_simulations')),false)
   AS simulation_rls_enabled,
 NOT has_table_privilege('authenticated',
   'public.beta_throne_duel_simulations','SELECT')
   AS simulations_private,
 EXISTS(SELECT 1 FROM pg_trigger WHERE
   tgrelid='public.beta_throne_challenge_shadow'::regclass
   AND tgname='beta_throne_duel_simulation_created'
   AND NOT tgisinternal AND tgenabled<>'D')
   AS simulator_trigger_active,
 EXISTS(SELECT 1 FROM pg_trigger WHERE
   tgrelid='public.throne_challenges'::regclass
   AND tgname='beta_throne_shadow_challenge_started'
   AND NOT tgisinternal AND tgenabled<>'D')
   AS sql31_snapshot_trigger_preserved,
 NOT has_function_privilege('authenticated',
   'public.beta_throne_duel_simulate_baseline(jsonb,jsonb,bigint)','EXECUTE')
   AS simulator_function_private,
 (public.beta_throne_duel_simulate_baseline(
   '[{"c":"Campion","hp":2000,"atk":400,"def":200}]'::jsonb,
   '[{"c":"Campion","hp":1500,"atk":150,"def":100}]'::jsonb,2
 )->>'outcome')='challenger' AS clear_challenger_case,
 (public.beta_throne_duel_simulate_baseline(
   '[{"c":"Campion","hp":1500,"atk":150,"def":100}]'::jsonb,
   '[{"c":"Campion","hp":2000,"atk":400,"def":200}]'::jsonb,2
 )->>'outcome')='holder' AS clear_holder_case;
