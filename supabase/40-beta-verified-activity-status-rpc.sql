-- Silver Throne / SQL40 / pasul 33 / BETA: actiuni verificate vizibile in joc.
-- Instalare MANUALA doar in Supabase Silver-Throne-Test, dupa SQL26 si SQL34.
-- NU LIVE. NU modifica salvarea, progresul, XP, aurul, inventarul, Lumea, Tronul.
-- Prima verticala completa: eveniment acceptat de server -> ledger SQL26/34
-- -> RPC read-only pentru proprietar -> UI Bresle BETA.
-- Nu valideaza nivelul sau echipamentul: authoritative_for_game=false.
BEGIN;

DO $preflight$
BEGIN
 IF to_regclass('public.beta_economy_accounts') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
   RAISE EXCEPTION 'SQL40 necesita SQL25/26/34 instalate in Silver-Throne-Test.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_accounts'
    AND column_name='verified_guild_boss_hits'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_accounts'
    AND column_name='verified_raid_uses'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_ledger'
    AND column_name='verified_guild_boss_hit_delta'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_ledger'
    AND column_name='verified_raid_uses_delta'
 ) THEN
   RAISE EXCEPTION 'SQL40 necesita coloanele de dovada SQL26/34.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger WHERE
     tgrelid='public.guild_boss_hits'::regclass
     AND tgname='beta_economy_guild_boss_hit_created'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) OR NOT EXISTS (
   SELECT 1 FROM pg_trigger WHERE
     tgrelid='public.world_raids'::regclass
     AND tgname='beta_economy_world_raid_started'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) THEN
   RAISE EXCEPTION 'SQL40 necesita trigger-ele SQL26/34 active.';
 END IF;
 IF COALESCE((SELECT NOT relrowsecurity FROM pg_class
     WHERE oid='public.beta_economy_ledger'::regclass),true)
    OR COALESCE((SELECT NOT relrowsecurity FROM pg_class
     WHERE oid='public.beta_economy_accounts'::regclass),true)
    OR has_table_privilege('authenticated','public.beta_economy_ledger','SELECT')
    OR has_table_privilege('authenticated','public.beta_economy_accounts','SELECT') THEN
   RAISE EXCEPTION 'SQL40: ledgerul trebuie sa ramana privat cu RLS.';
 END IF;
END
$preflight$;

-- RPC nu primeste user_id, numar de activitati sau rezultat de lupta.
-- Citește doar sub auth.uid() si exclusiv pentru conturi BETA autorizate.
-- Cele doua tipuri de activitati sunt evenimente confirmate la START/HIT,
-- nu victorii competitive si nu experienta/level obținute in joc.
-- Comparatia ledger/counter este un semnal de diagnostic, fara sanctiuni.
CREATE OR REPLACE FUNCTION public.beta_verified_activity_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $verified$
DECLARE
 v_user uuid:=auth.uid();
 v_ledger_boss bigint:=0;
 v_ledger_raids bigint:=0;
 v_counter_boss bigint:=0;
 v_counter_raids bigint:=0;
 v_enrolled boolean:=false;
BEGIN
 IF v_user IS NULL OR auth.role() IS DISTINCT FROM 'authenticated'
    OR NOT public.is_beta_admin() THEN
   RAISE EXCEPTION 'Acces doar pentru contul autentificat BETA.';
 END IF;

 SELECT coalesce(a.verified_guild_boss_hits,0),
        coalesce(a.verified_raid_uses,0),a.user_id IS NOT NULL
 INTO v_counter_boss,v_counter_raids,v_enrolled
 FROM public.beta_economy_accounts a
 WHERE a.user_id=v_user;
 IF NOT FOUND THEN
   v_counter_boss:=0;v_counter_raids:=0;v_enrolled:=false;
 END IF;

 SELECT
  count(*) FILTER (
    WHERE l.source='guild_boss_hit_verified'
      AND l.verified_guild_boss_hit_delta=1
      AND l.gold_delta=0 AND l.ore_delta=0 AND l.xp_delta=0
      AND l.event_key LIKE 'guild-boss-hit:%'),
  count(*) FILTER (
    WHERE l.source='raid_energy_verified'
      AND l.verified_raid_uses_delta=1
      AND l.gold_delta=0 AND l.ore_delta=0 AND l.xp_delta=0
      AND l.event_key LIKE 'world-raid-start:%')
 INTO v_ledger_boss,v_ledger_raids
 FROM public.beta_economy_ledger l
 WHERE l.user_id=v_user;

 RETURN jsonb_build_object(
   'ready',true,'mode','audit','enrolled',v_enrolled,
   'verified_boss_hits',v_ledger_boss,
   'verified_raid_starts',v_ledger_raids,
   'counter_boss_hits',v_counter_boss,
   'counter_raid_starts',v_counter_raids,
   'consistent',(v_ledger_boss=v_counter_boss
       AND v_ledger_raids=v_counter_raids),
   'authoritative_for_game',false);
END
$verified$;

REVOKE ALL ON FUNCTION public.beta_verified_activity_status()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.beta_verified_activity_status()
 TO authenticated;
COMMIT;

-- 9 rezultate structurale; toate TRUE inseamna numai RPC+privacy instalate.
SELECT
 to_regprocedure('public.beta_verified_activity_status()') IS NOT NULL
   AS status_rpc_exists,
 has_function_privilege('authenticated',
    'public.beta_verified_activity_status()','EXECUTE')
   AS own_status_callable,
 NOT has_function_privilege('anon',
    'public.beta_verified_activity_status()','EXECUTE')
   AS anon_status_denied,
 COALESCE((SELECT relrowsecurity FROM pg_class
    WHERE oid=to_regclass('public.beta_economy_ledger')),false)
   AS ledger_rls_preserved,
 COALESCE((SELECT relrowsecurity FROM pg_class
    WHERE oid=to_regclass('public.beta_economy_accounts')),false)
   AS account_rls_preserved,
 NOT has_table_privilege('authenticated',
    'public.beta_economy_ledger','SELECT')
   AS direct_ledger_read_denied,
 NOT has_table_privilege('authenticated',
    'public.beta_economy_accounts','SELECT')
   AS direct_account_read_denied,
 EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.guild_boss_hits'::regclass
     AND tgname='beta_economy_guild_boss_hit_created'
     AND NOT tgisinternal AND tgenabled<>'D')
   AS sql34_boss_trigger_preserved,
 EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_raids'::regclass
     AND tgname='beta_economy_world_raid_started'
     AND NOT tgisinternal AND tgenabled<>'D')
   AS sql26_raid_trigger_preserved;

-- Nu este un RPC public de XP sau progres. Pentru QA real:
-- vizualizeaza secțiunea «Activitati confirmate de server» din Bresle BETA.
-- Nu cere ID-uri, nu scrie niciun rând și nu modifica jurnalul.
