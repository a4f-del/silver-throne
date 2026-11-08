-- Silver Throne · SQL39 / pasul 33 / BETA: minereu SHADOW din raid INCEPUT.
-- Instalare MANUALA NUMAI in Supabase Silver-Throne-Test dupa SQL26/37/38.
-- NU LIVE. Niciun credit la instalare, niciun trigger pe raid/guild_api.
-- Source: world_raid_start (server) -> world_raids -> SQL26 ledger, NU victorie.
-- Exact +1 MINEREU SHADOW per eveniment acceptat; nu este lootul jocului.
-- NU importa game_saves / S.ore, nu afecteaza minereul, energia sau jocul real.
BEGIN;

DO $preflight$
BEGIN
 IF to_regclass('public.world_raids') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regclass('public.beta_economy_accounts') IS NULL
    OR to_regclass('public.beta_forge_shadow_material_grants') IS NULL
    OR to_regclass('public.beta_admins') IS NULL
    OR to_regprocedure('public.beta_economy_apply_internal(uuid,text,text,bigint,bigint,bigint)') IS NULL THEN
   RAISE EXCEPTION 'SQL39 necesita SQL25/26 si SQL37/38 in Silver-Throne-Test.';
 END IF;
 IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_raids'::regclass
      AND tgname='beta_economy_world_raid_started'
      AND NOT tgisinternal AND tgenabled<>'D'
 ) OR coalesce((SELECT NOT relrowsecurity FROM pg_class
       WHERE oid='public.beta_economy_ledger'::regclass),true)
    OR coalesce((SELECT NOT relrowsecurity FROM pg_class
       WHERE oid='public.world_raids'::regclass),true)
    OR has_table_privilege('authenticated','public.world_raids','INSERT')
    OR has_table_privilege('anon','public.world_raids','INSERT')
    OR has_table_privilege('authenticated','public.beta_economy_ledger','INSERT')
    OR has_table_privilege('authenticated','public.beta_economy_accounts','UPDATE')
 THEN
   RAISE EXCEPTION 'SQL39 refuza instalarea: raidul/registrul nu sunt protejate.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_ledger'
     AND column_name='verified_raid_uses_delta'
 ) THEN
   RAISE EXCEPTION 'SQL39 necesita dovada consumului de raid SQL26.';
 END IF;
END
$preflight$;

-- Registre private, separate de walletul vizibil. Primar: ID eveniment
-- server-side din SQL26. Creditele sunt legate si de randul NOU din ledger
-- al aplicarii economice shadow (idempotenta SQL25).
CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_ore_grants (
 source_ledger_id bigint PRIMARY KEY
   REFERENCES public.beta_economy_ledger(id) ON DELETE CASCADE,
 credit_ledger_id bigint NOT NULL UNIQUE
   REFERENCES public.beta_economy_ledger(id) ON DELETE CASCADE,
 user_id uuid NOT NULL
   REFERENCES public.beta_economy_accounts(user_id) ON DELETE CASCADE,
 ore_amount integer NOT NULL DEFAULT 1 CHECK (ore_amount=1),
 issued_at timestamptz NOT NULL DEFAULT now(),
 CHECK (source_ledger_id<>credit_ledger_id)
);
CREATE INDEX IF NOT EXISTS beta_forge_shadow_ore_grants_user_recent
 ON public.beta_forge_shadow_ore_grants(user_id,issued_at DESC);
ALTER TABLE public.beta_forge_shadow_ore_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_forge_shadow_ore_grants
 FROM PUBLIC,anon,authenticated;

-- Operatorul poate apela numai o functie INTERNA, fara identificatori
-- furnizati de client, care revalideaza fiecare raid cu:
--  * world_raids.id + attacker emise de server
--  * SQL26 ledger source si flag de consum
--  * BETA admin + cont cu state=shadow
--  * delta gold/ore/xp zero a evenimentului original
-- O actiune noua in ledger primeste source=admin_adjustment, intrucat
-- SQL25 nu expune un tip de eveniment nou. Provenienta ACTUALA este
-- descrisa in aceasta tabela, nu dovedita de textul "admin_adjustment".
CREATE OR REPLACE FUNCTION public.beta_forge_shadow_reconcile_raid_ore_internal(
 p_limit integer DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $reconcile$
DECLARE
 v_event record;
 v_account public.beta_economy_accounts%ROWTYPE;
 v_result jsonb;
 v_key text;
 v_credit_id bigint;
 v_grants integer := 0;
BEGIN
 IF auth.uid() IS NOT NULL
   OR coalesce(auth.role(),'') NOT IN ('','service_role') THEN
    RAISE EXCEPTION 'Reconcilierea minereului SHADOW nu este accesibila jucatorilor.';
 END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Limita trebuie sa fie 1..100.';
 END IF;

 -- Nu blocam randurile source ledger inainte de cont: SQL26 si SQL37
 -- blocheaza intai contul si apoi scriu in ledger. Pastram aceeasi ordine
 -- pentru a evita deadlock. Dupa lock de cont REVERIFICAM eligibilitatea.
 FOR v_event IN
   SELECT l.id,l.user_id
   FROM public.beta_economy_ledger l
   JOIN public.world_raids r ON
     l.event_key=('world-raid-start:'||r.id::text)
     AND r.attacker=l.user_id
   JOIN public.beta_admins b ON b.user_id=l.user_id
   JOIN public.beta_economy_accounts a ON a.user_id=l.user_id
   WHERE l.source='raid_energy_verified'
     AND l.verified_raid_uses_delta=1
     AND l.gold_delta=0 AND l.ore_delta=0 AND l.xp_delta=0
     AND a.state='shadow'
     AND NOT EXISTS (
       SELECT 1 FROM public.beta_forge_shadow_ore_grants g
       WHERE g.source_ledger_id=l.id
     )
   ORDER BY l.id
   LIMIT p_limit
 LOOP
   SELECT * INTO v_account FROM public.beta_economy_accounts
   WHERE user_id=v_event.user_id FOR UPDATE;
   IF NOT FOUND OR v_account.state<>'shadow' THEN CONTINUE; END IF;

   -- Snapshotul primului SELECT poate fi invechit in cazul a doi workeri.
   -- Revalidam dupa lock, in tranzactia curenta.
   IF EXISTS (
       SELECT 1 FROM public.beta_forge_shadow_ore_grants
       WHERE source_ledger_id=v_event.id
     ) OR NOT EXISTS (
       SELECT 1 FROM public.beta_economy_ledger l
       JOIN public.world_raids r ON
         l.event_key=('world-raid-start:'||r.id::text)
         AND r.attacker=l.user_id
       JOIN public.beta_admins b ON b.user_id=l.user_id
       WHERE l.id=v_event.id AND l.user_id=v_event.user_id
         AND l.source='raid_energy_verified'
         AND l.verified_raid_uses_delta=1
         AND l.gold_delta=0 AND l.ore_delta=0 AND l.xp_delta=0
     ) THEN CONTINUE; END IF;

   -- Valorile de credit (+1) si cheia vin din dovada SQL26, nu browser.
   -- beta_economy_apply_internal verifica soldul max si face UPDATE +
   -- INSERT in acelasi transaction; orice esec anuleaza intregul lot.
   v_key:='shadow-raid-ore:'||v_event.id::text;
   v_result:=public.beta_economy_apply_internal(
      v_event.user_id,v_key,'admin_adjustment',0,1,0);
   IF coalesce((v_result->>'already')::boolean,false) THEN
      RAISE EXCEPTION 'Credit orfan fara provenienta: necesita QA manual, nu dublam.';
   END IF;
   SELECT id INTO STRICT v_credit_id FROM public.beta_economy_ledger
   WHERE user_id=v_event.user_id AND event_key=v_key
     AND source='admin_adjustment' AND gold_delta=0 AND ore_delta=1
     AND xp_delta=0;

   INSERT INTO public.beta_forge_shadow_ore_grants(
     source_ledger_id,credit_ledger_id,user_id,ore_amount
   ) VALUES (
     v_event.id,v_credit_id,v_event.user_id,1
   );
   v_grants:=v_grants+1;
 END LOOP;

 RETURN jsonb_build_object('ok',true,'mode','shadow',
   'new_ore_grants',v_grants,'limit',p_limit);
END
$reconcile$;

REVOKE ALL ON FUNCTION public.beta_forge_shadow_reconcile_raid_ore_internal(integer)
 FROM PUBLIC,anon,authenticated;
COMMIT;

-- Diagnoza de instalare READ-ONLY; 9/9 TRUE = doar schema si drepturi.
SELECT
 to_regclass('public.beta_forge_shadow_ore_grants') IS NOT NULL
   AS ore_provenance_table_exists,
 COALESCE((SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_forge_shadow_ore_grants')),false)
   AS ore_provenance_rls,
 NOT has_table_privilege('authenticated',
   'public.beta_forge_shadow_ore_grants','INSERT')
   AS players_cannot_grant_ore,
 NOT has_table_privilege('authenticated',
   'public.beta_forge_shadow_ore_grants','SELECT')
   AS players_cannot_read_grants,
 NOT has_table_privilege('anon',
   'public.beta_forge_shadow_ore_grants','INSERT')
   AS anon_cannot_grant_ore,
 to_regprocedure('public.beta_forge_shadow_reconcile_raid_ore_internal(integer)')
   IS NOT NULL AS ore_reconciler_exists,
 NOT has_function_privilege('authenticated',
   'public.beta_forge_shadow_reconcile_raid_ore_internal(integer)',
   'EXECUTE') AS players_cannot_reconcile_ore,
 NOT has_function_privilege('anon',
   'public.beta_forge_shadow_reconcile_raid_ore_internal(integer)',
   'EXECUTE') AS anon_cannot_reconcile_ore,
 EXISTS (SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_raids'::regclass
    AND tgname='beta_economy_world_raid_started'
    AND NOT tgisinternal AND tgenabled<>'D')
    AS sql26_trigger_preserved;

-- Diagnoza agregata; instalarea nu face backfill si nu modifica solduri.
SELECT
 (SELECT count(*)::bigint FROM public.beta_forge_shadow_ore_grants)
   AS shadow_ore_grants,
 (SELECT coalesce(sum(a.ore),0)::bigint
    FROM public.beta_economy_accounts a
    WHERE a.state='shadow') AS total_ore_shadow,
 (SELECT count(*)::bigint FROM public.beta_forge_shadow_operations)
   AS shadow_forge_operations;
