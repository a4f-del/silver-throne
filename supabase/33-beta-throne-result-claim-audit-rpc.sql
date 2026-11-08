-- Silver Throne · SQL33 / BETA · Pasul 33 · inregistrare separata a
-- verdictului DECLARAT de client la Tron, dupa finalizarea oficiala.
--
-- Numai Supabase Silver-Throne-Test; NU LIVE. Ruleaza manual dupa SQL31+SQL32.
-- NU modifica functiile originale throne_challenge_start/finish/publish.
-- NU decide victoria si NU crediteaza recompense/aur/XP, nici nu sterge date.
-- Premisa: in SQL31, anumite scheme de throne_challenges nu au campul win,
-- astfel reported_win poate ramane NULL. Aici il notam explicit ca
-- "client_claim_via_rpc" (NEVER "server_verified"). Nu valideaza victoria.
--
-- Inainte de instalare front-end-ul BETA foloseste in continuare originalul
-- throne_challenge_finish daca acest wrapper lipseste din schema cache.

BEGIN;

DO $prereq$
BEGIN
 IF to_regclass('public.beta_throne_challenge_shadow') IS NULL
    OR to_regclass('public.beta_throne_duel_simulations') IS NULL
    OR to_regclass('public.throne_challenges') IS NULL
    OR to_regprocedure('public.throne_challenge_finish(bigint,boolean)') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
   RAISE EXCEPTION
     'SQL33 necesita SQL31 si SQL32 instalate in Silver-Throne-Test.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='throne_challenges'
     AND column_name='user_id'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='throne_challenges'
     AND column_name='finished'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_throne_challenge_shadow'
     AND column_name='reported_win'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_throne_challenge_shadow'
     AND column_name='result_field'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_throne_challenge_shadow'
     AND column_name='completed_at'
 ) THEN
   RAISE EXCEPTION 'SQL33: schema Tronului este diferita; nu schimbam nimic.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.throne_challenges'::regclass
     AND tgname='beta_throne_shadow_challenge_finished'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) OR NOT EXISTS (
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.beta_throne_challenge_shadow'::regclass
     AND tgname='beta_throne_duel_simulation_created'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) THEN
   RAISE EXCEPTION 'SQL33 necesita trigger-ele SQL31 si SQL32 active.';
 END IF;
END
$prereq$;

-- Wrapper strict BETA: se executa aceeasi functie oficiala, in aceeasi
-- tranzactie. Dupa rezultat, se noteaza ca audit DOAR declaratia clientului.
-- Nu rescriem niciun camp din tabela oficiala throne_challenges.
CREATE OR REPLACE FUNCTION public.beta_throne_challenge_finish_audited(
  p_id bigint, p_win boolean
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $finish$
DECLARE
 v_uid uuid := auth.uid();
 v_was_finished boolean;
 v_now_finished boolean;
 v_answer jsonb;
BEGIN
 IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
   RAISE EXCEPTION 'Acces BETA neautorizat.';
 END IF;
 IF p_id IS NULL OR p_win IS NULL THEN
   RAISE EXCEPTION 'Parametri de finalizare invalidi.';
 END IF;

 -- Verificam ca provocarea este chiar a utilizatorului autentificat.
 -- FARA FOR UPDATE: functia originala isi alege singura ordinea lockurilor.
 SELECT c.finished INTO v_was_finished
 FROM public.throne_challenges c
 WHERE c.id=p_id AND c.user_id=v_uid;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Provocare necunoscuta sau nu iti apartine.';
 END IF;

 -- Singura decizie oficiala ramane aici, in RPC-ul original.
 -- Daca el respinge cererea, exceptia se propaga si nimic nu este auditat.
 v_answer := public.throne_challenge_finish(p_id,p_win);

 SELECT c.finished INTO v_now_finished
 FROM public.throne_challenges c
 WHERE c.id=p_id AND c.user_id=v_uid;

 -- Un rezultat deja finalizat NU poate fi rescris printr-un retry
 -- cu alta valoare p_win. Acceptam doar tranzitia noua false->true.
 IF NOT coalesce(v_was_finished,false)
    AND coalesce(v_now_finished,false) THEN
   BEGIN
     UPDATE public.beta_throne_challenge_shadow
     SET reported_win=p_win,
         result_field='client_claim_via_rpc',
         completed_at=coalesce(completed_at,now())
     WHERE challenge_id=p_id AND challenger_id=v_uid
       AND reported_win IS NULL
       AND (result_field IS NULL OR result_field='unavailable');
   EXCEPTION WHEN OTHERS THEN
     -- Un esec de diagnoza nu poate anula duelul oficial.
     RAISE WARNING 'SQL33 audit declaratie Tron %: %',p_id,SQLERRM;
   END;
 END IF;
 RETURN v_answer;
END
$finish$;

REVOKE ALL ON FUNCTION public.beta_throne_challenge_finish_audited(
 bigint,boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.beta_throne_challenge_finish_audited(
 bigint,boolean
) TO authenticated;

COMMIT;

-- DIAGNOSTIC READ-ONLY: toate cele 8 rezultate trebuie sa fie true.
SELECT
 to_regprocedure('public.beta_throne_challenge_finish_audited(bigint,boolean)')
   IS NOT NULL AS wrapper_exists,
 has_function_privilege('authenticated',
   'public.beta_throne_challenge_finish_audited(bigint,boolean)','EXECUTE')
   AS authenticated_can_call,
 NOT has_function_privilege('anon',
   'public.beta_throne_challenge_finish_audited(bigint,boolean)','EXECUTE')
   AS anonymous_cannot_call,
 NOT has_table_privilege('authenticated',
   'public.beta_throne_challenge_shadow','UPDATE')
   AS shadow_table_still_private,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.throne_challenges'::regclass
     AND tgname='beta_throne_shadow_challenge_finished'
     AND NOT tgisinternal AND tgenabled<>'D')
   AS sql31_finish_capture_preserved,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.beta_throne_challenge_shadow'::regclass
     AND tgname='beta_throne_duel_simulation_created'
     AND NOT tgisinternal AND tgenabled<>'D')
   AS sql32_simulator_preserved,
 to_regprocedure('public.throne_challenge_finish(bigint,boolean)')
   IS NOT NULL AS official_finish_preserved,
 position('is_beta_admin()' in pg_get_functiondef(
   'public.beta_throne_challenge_finish_audited(bigint,boolean)'::regprocedure
 ))>0 AS wrapper_has_admin_guard;
