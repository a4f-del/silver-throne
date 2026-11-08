-- Silver Throne / SQL38 / pasul 33 / BETA: material SHADOW din lovituri SQL34.
-- DOAR Supabase Silver-Throne-Test, MANUAL dupa SQL34 si SQL37. NU LIVE.
-- Instalarea NU crediteaza nimic si NU schimba guild_api / raiduri / salvarea.
-- Reconcilierea este manuala/interna: 1 material 'cal' SHADOW per eveniment
-- guild_boss_hit_verified existent, legat de o lovitura SQL reala.
-- Dovedeste numai lovitura ACCEPTATA DE SERVER, nu autenticitatea stats.
-- Niciun UUID, damage, material sau cuantum din browser nu este acceptat.
BEGIN;

DO $guard$
BEGIN
 IF to_regclass('public.beta_forge_shadow_materials') IS NULL
    OR to_regclass('public.beta_forge_shadow_operations') IS NULL
    OR to_regclass('public.beta_economy_accounts') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regclass('public.guild_boss_hits') IS NULL
    OR to_regclass('public.beta_admins') IS NULL
    OR to_regprocedure('public.beta_forge_shadow_commit_internal(uuid,uuid,text,integer,integer,integer,text)') IS NULL
    OR to_regprocedure('public.beta_economy_capture_guild_boss_hit()') IS NULL
 THEN
   RAISE EXCEPTION 'SQL38 necesita SQL34 si SQL37 instalate in BETA.';
 END IF;
 IF COALESCE((SELECT NOT relrowsecurity FROM pg_class
       WHERE oid='public.beta_forge_shadow_materials'::regclass),true)
    OR has_table_privilege('authenticated','public.beta_forge_shadow_materials','INSERT')
    OR has_table_privilege('authenticated','public.beta_forge_shadow_materials','UPDATE')
    OR has_table_privilege('anon','public.beta_forge_shadow_materials','UPDATE')
    OR has_table_privilege('authenticated','public.beta_economy_ledger','INSERT')
    OR has_table_privilege('authenticated','public.guild_boss_hits','INSERT')
    OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid='public.guild_boss_hits'::regclass
         AND tgname='beta_economy_guild_boss_hit_created'
         AND NOT tgisinternal AND tgenabled<>'D'
    )
 THEN
   RAISE EXCEPTION 'SQL38: registrul sau sursa SQL34 nu sunt private si active.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_ledger'
     AND column_name='verified_guild_boss_hit_delta'
 ) THEN
   RAISE EXCEPTION 'SQL38 necesita coloana de dovada din SQL34.';
 END IF;
END
$guard$;

-- Numai dovezi din ledger, fara proiectarea ID-urilor catre browser.
-- Stergerea contului/evenimentului elimina si marcajul de provenienta;
-- soldurile shadow sunt per acelasi cont si nu se expun clientilor.
CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_material_grants (
 event_ledger_id bigint PRIMARY KEY
   REFERENCES public.beta_economy_ledger(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.beta_economy_accounts(user_id)
   ON DELETE CASCADE,
 material_code text NOT NULL DEFAULT 'cal'
   CHECK (material_code='cal'),
 quantity integer NOT NULL DEFAULT 1 CHECK (quantity=1),
 issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS beta_forge_shadow_material_grants_user
 ON public.beta_forge_shadow_material_grants(user_id,issued_at DESC);

ALTER TABLE public.beta_forge_shadow_material_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_forge_shadow_material_grants
 FROM PUBLIC,anon,authenticated;

-- RECONCILIERE EXPLICITA; nu este trigger pe lupta ori pe guild_api.
-- Event ID vine din ledger SQL34, iar dovada este revalidata prin
-- JOIN cu guild_boss_hits (ID server-side + acelasi proprietar).
-- Lucru in loturi limitate, cu SELECT FOR UPDATE SKIP LOCKED:
-- doua workers nu platesc acelasi eveniment, retry-ul da 0 granturi.
-- Lockul contului este acelasi folosit de SQL25/SQL37.
-- Nu exista parametrul user_id, quantity sau material_code in API.
CREATE OR REPLACE FUNCTION public.beta_forge_shadow_reconcile_boss_materials_internal(
 p_limit integer DEFAULT 50
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $reconcile$
DECLARE
 v_event record;
 v_account public.beta_economy_accounts%ROWTYPE;
 v_granted integer := 0;
 v_new integer;
BEGIN
 IF auth.uid() IS NOT NULL
    OR coalesce(auth.role(),'') NOT IN ('','service_role') THEN
   RAISE EXCEPTION 'Reconcilierea SHADOW nu este accesibila jucatorilor.';
 END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
   RAISE EXCEPTION 'Limita de reconciliere invalida (1..100).';
 END IF;

 FOR v_event IN
   SELECT l.id,l.user_id
     FROM public.beta_economy_ledger l
     JOIN public.guild_boss_hits h
       ON l.event_key=('guild-boss-hit:'||h.id::text)
       AND h.user_id=l.user_id
     JOIN public.beta_admins b ON b.user_id=l.user_id
     JOIN public.beta_economy_accounts a ON a.user_id=l.user_id
    WHERE l.source='guild_boss_hit_verified'
      AND l.verified_guild_boss_hit_delta=1
      AND l.gold_delta=0 AND l.ore_delta=0 AND l.xp_delta=0
      AND a.state='shadow'
      AND NOT EXISTS (
        SELECT 1 FROM public.beta_forge_shadow_material_grants g
        WHERE g.event_ledger_id=l.id
      )
    ORDER BY l.id
    LIMIT p_limit
    FOR UPDATE OF l SKIP LOCKED
 LOOP
   SELECT * INTO v_account FROM public.beta_economy_accounts
   WHERE user_id=v_event.user_id FOR UPDATE;
   IF NOT FOUND OR v_account.state<>'shadow' THEN
     CONTINUE;
   END IF;

   INSERT INTO public.beta_forge_shadow_material_grants(
     event_ledger_id,user_id,material_code,quantity
   ) VALUES (v_event.id,v_event.user_id,'cal',1)
   ON CONFLICT(event_ledger_id) DO NOTHING;
   GET DIAGNOSTICS v_new=ROW_COUNT;
   IF v_new=1 THEN
     INSERT INTO public.beta_forge_shadow_materials(
       user_id,material_code,balance
     ) VALUES (v_event.user_id,'cal',1)
     ON CONFLICT(user_id,material_code) DO UPDATE
       SET balance=public.beta_forge_shadow_materials.balance+1,
           updated_at=now()
       WHERE public.beta_forge_shadow_materials.balance<1000000000;
     IF NOT FOUND THEN
       RAISE EXCEPTION 'Limita de material shadow atinsa, anulam lotul.';
     END IF;
     v_granted:=v_granted+1;
   END IF;
 END LOOP;
 RETURN jsonb_build_object('ok',true,'mode','shadow',
   'new_material_grants',v_granted,'limit',p_limit);
END
$reconcile$;

REVOKE ALL ON FUNCTION public.beta_forge_shadow_reconcile_boss_materials_internal(integer)
 FROM PUBLIC,anon,authenticated;
COMMIT;

-- Verificari READ-ONLY (9/9 TRUE = doar instalare, nu evenimente validate QA).
SELECT
 to_regclass('public.beta_forge_shadow_material_grants') IS NOT NULL
   AS provenance_table_exists,
 COALESCE((SELECT relrowsecurity FROM pg_class
    WHERE oid=to_regclass('public.beta_forge_shadow_material_grants')),false)
   AS provenance_rls_enabled,
 NOT has_table_privilege('authenticated',
    'public.beta_forge_shadow_material_grants','INSERT')
   AS player_cannot_grant,
 NOT has_table_privilege('authenticated',
    'public.beta_forge_shadow_material_grants','SELECT')
   AS player_cannot_read_provenance,
 NOT has_table_privilege('anon',
    'public.beta_forge_shadow_material_grants','INSERT')
   AS anon_cannot_grant,
 to_regprocedure('public.beta_forge_shadow_reconcile_boss_materials_internal(integer)')
    IS NOT NULL AS private_reconciler_exists,
 NOT has_function_privilege('authenticated',
    'public.beta_forge_shadow_reconcile_boss_materials_internal(integer)',
    'EXECUTE') AS player_cannot_reconcile,
 NOT has_function_privilege('anon',
    'public.beta_forge_shadow_reconcile_boss_materials_internal(integer)',
    'EXECUTE') AS anon_cannot_reconcile,
 EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.guild_boss_hits'::regclass
      AND tgname='beta_economy_guild_boss_hit_created'
      AND NOT tgisinternal AND tgenabled<>'D'
 ) AS sql34_trigger_preserved;

-- Fara PII sau materialele altor utilizatori; nu modifica nimic.
-- La instalare noua: 0 granturi, indiferent cate evenimente SQL34 exista.
SELECT
 (SELECT count(*)::bigint
    FROM public.beta_forge_shadow_material_grants) AS shadow_material_grants,
 (SELECT coalesce(sum(balance),0)::bigint
    FROM public.beta_forge_shadow_materials
    WHERE material_code='cal') AS shadow_cal_balance,
 (SELECT count(*)::bigint
    FROM public.beta_forge_shadow_operations) AS shadow_forge_operations;
