-- Silver Throne / SQL41 / pasul 33 / BETA.
-- Progres shadow calculat efectiv pe server, din evenimente SQL26/34.
-- DOAR Silver-Throne-Test, instalare manuala DUPA SQL40. NU LIVE.
-- Functia existenta SQL40 ramane compatibila (aceleasi chei), adaugand
-- «verified_training»: XP si nivel NUMAI pentru test/QA, separate de erou.
-- Nu schimba XP, nivel, game_saves, echipament, resurse sau recompense reale.
-- Nu acorda XP pentru victorii PvP (clientul inca declara p_win).
-- Nu adauga tabele, trigger-e sau evente economice noi.
BEGIN;
DO $preflight$
BEGIN
 IF to_regprocedure('public.beta_verified_activity_status()') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regclass('public.beta_economy_accounts') IS NULL THEN
   RAISE EXCEPTION 'SQL41 necesita SQL40 + SQL25/26/34 in proiectul BETA.';
 END IF;
 IF NOT EXISTS(
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.guild_boss_hits'::regclass
     AND tgname='beta_economy_guild_boss_hit_created'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) OR NOT EXISTS(
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_raids'::regclass
     AND tgname='beta_economy_world_raid_started'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) OR coalesce((SELECT NOT relrowsecurity FROM pg_class
     WHERE oid='public.beta_economy_ledger'::regclass),true)
    OR has_table_privilege('authenticated','public.beta_economy_ledger','SELECT')
    OR has_table_privilege('authenticated','public.beta_economy_accounts','SELECT') THEN
   RAISE EXCEPTION 'SQL41: evenimentele de progres trebuie sa ramana private.';
 END IF;
END $preflight$;

-- Contract SQL40 pastrat intact si extins numai cu date suplimentare,
-- derivate fara input de la jucator. Nicio suma nu intra in SQL25.xp.
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
 v_training_xp bigint:=0;
 v_training_level integer:=1;
 v_training_in_level integer:=0;
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

 -- 25 XP pentru o lovitura acceptata; 5 XP pentru startul raidului.
 -- Aceste puncte sunt EXCLUSIV antrenament SHADOW, fara gameplay.
 -- Se calculeaza din intrari private SQL26/34, nu din game_saves.
 v_training_xp:=LEAST(1000000000::numeric,
    v_ledger_boss::numeric*25 + v_ledger_raids::numeric*5)::bigint;
 v_training_level:=LEAST(50,1+(v_training_xp/100)::integer);
 v_training_in_level:=CASE WHEN v_training_level>=50
    THEN 0 ELSE (v_training_xp % 100)::integer END;

 RETURN jsonb_build_object(
   'ready',true,'mode','audit','enrolled',v_enrolled,
   'verified_boss_hits',v_ledger_boss,
   'verified_raid_starts',v_ledger_raids,
   'counter_boss_hits',v_counter_boss,
   'counter_raid_starts',v_counter_raids,
   'consistent',(v_ledger_boss=v_counter_boss
       AND v_ledger_raids=v_counter_raids),
   'authoritative_for_game',false,
   'verified_training',jsonb_build_object(
      'rules_version',1,
      'xp_total',v_training_xp,
      'level',v_training_level,
      'xp_in_level',v_training_in_level,
      'xp_to_next',CASE WHEN v_training_level>=50 THEN NULL ELSE 100 END,
      'xp_per_boss_hit',25,
      'xp_per_raid_start',5,
      'hero_level_authoritative',false));
END
$verified$;

REVOKE ALL ON FUNCTION public.beta_verified_activity_status()
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.beta_verified_activity_status()
 TO authenticated;
COMMIT;

-- QA read-only: 9 booleene TRUE dovedesc instalarea, nu gameplay autoritativ.
SELECT
  to_regprocedure('public.beta_verified_activity_status()') IS NOT NULL
    AS status_rpc_exists,
  has_function_privilege('authenticated',
    'public.beta_verified_activity_status()','EXECUTE')
    AS user_can_read_own_status,
  NOT has_function_privilege('anon',
    'public.beta_verified_activity_status()','EXECUTE')
    AS anon_cannot_read,
  coalesce((SELECT relrowsecurity FROM pg_class
    WHERE oid=to_regclass('public.beta_economy_ledger')),false)
    AS ledger_rls_preserved,
  NOT has_table_privilege('authenticated',
    'public.beta_economy_ledger','SELECT')
    AS ledger_private,
  coalesce(position('verified_training' IN pg_get_functiondef(
    to_regprocedure('public.beta_verified_activity_status()')))>0,false)
    AS training_fields_installed,
  coalesce(position('v_ledger_boss::numeric*25' IN pg_get_functiondef(
    to_regprocedure('public.beta_verified_activity_status()')))>0,false)
    AS boss_xp_rate_fixed,
  coalesce(position('v_ledger_raids::numeric*5' IN pg_get_functiondef(
    to_regprocedure('public.beta_verified_activity_status()')))>0,false)
    AS raid_xp_rate_fixed,
  coalesce(position('auth.uid()' IN pg_get_functiondef(
    to_regprocedure('public.beta_verified_activity_status()')))>0,false)
    AS owner_identity_enforced;

-- Nicio noua tabela si niciun backfill. RPC-ul se citeste din meniul Bresle.
