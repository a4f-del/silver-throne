-- Silver Throne / SQL37 / pasul 33 / BETA: forjare TRANZACTIONALA in SHADOW.
-- Instaleaza MANUAL doar in Silver-Throne-Test, dupa SQL25–26 si SQL34–36.
-- Nu modifica forjarea reala din browser, game_saves, inventarul sau LIVE.
-- Serverul poate debita doar registrul SHADOW si materialele sale private.
-- FARA alimentare din game_saves si FARA RPC public de craft/mint.
-- Un worker viitor trebuie sa ateste nivelul si sursa materialelor inainte
-- sa poata folosi aceasta functie; deocamdata toate soldurile noi sunt 0.
BEGIN;

DO $preflight$
BEGIN
 IF to_regclass('public.beta_economy_accounts') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regclass('public.beta_item_provenance_receipts') IS NULL
    OR to_regclass('public.beta_admins') IS NULL
    OR to_regprocedure('public.beta_economy_apply_internal(uuid,text,text,bigint,bigint,bigint)') IS NULL
    OR to_regprocedure('public.beta_item_replay_model_v1(text,integer,integer,integer,text,bigint)') IS NULL
    OR to_regprocedure('public.beta_item_replay_receipt_v1(uuid)') IS NULL THEN
    RAISE EXCEPTION 'SQL37 necesita SQL25/26 si SQL34/35/36 instalate in BETA.';
 END IF;
 IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.beta_item_provenance_receipts'::regclass
      AND tgname='beta_item_provenance_source_guard'
      AND NOT tgisinternal AND tgenabled<>'D'
 ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.guild_boss_hits'::regclass
      AND tgname='beta_economy_guild_boss_hit_created'
      AND NOT tgisinternal AND tgenabled<>'D'
 ) OR coalesce((SELECT NOT relrowsecurity FROM pg_class
    WHERE oid='public.beta_item_provenance_receipts'::regclass),true)
    OR has_table_privilege('authenticated','public.beta_item_provenance_receipts','INSERT')
    OR has_table_privilege('authenticated','public.beta_economy_accounts','UPDATE') THEN
    RAISE EXCEPTION 'SQL37 refuza instalarea cu acces direct sau guard SQL35/34 lipsa.';
 END IF;
END
$preflight$;

-- Depozit NOU, privat: NU copiaza materialele din salvarea clientului.
-- Inaintea unui emitent autentic pentru materiale, orice craft nefinantat
-- va esua in mod sigur. Nu oferim API client pentru depuneri/retrageri.
CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_materials (
 user_id uuid NOT NULL REFERENCES public.beta_economy_accounts(user_id)
    ON DELETE CASCADE,
 material_code text NOT NULL CHECK (
    material_code IN ('zim','sng','bli','cal','vul','pra','rab',
      'izv','pia','ven','fie','cen','osn','frag')
    OR material_code ~ '^(jwf|jwb|esf)[0-4]$'
 ),
 balance bigint NOT NULL DEFAULT 0 CHECK (balance BETWEEN 0 AND 1000000000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,material_code)
);

-- Journal de operatiuni; cererea poate fi repetata in siguranta.
-- Idempotenta pe (user_id,request_id), cu rezultat legat de un singur
-- event ledger si un singur receipt (ambele private).
CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_operations (
 user_id uuid NOT NULL REFERENCES public.beta_economy_accounts(user_id)
    ON DELETE CASCADE,
 request_id uuid NOT NULL,
 item_type text NOT NULL,
 item_level integer NOT NULL,
 item_rarity integer NOT NULL,
 item_quality integer NOT NULL,
 template_key text NOT NULL,
 ore_cost bigint NOT NULL CHECK (ore_cost>0),
 material_costs jsonb NOT NULL,
 event_ledger_id bigint NOT NULL UNIQUE
   REFERENCES public.beta_economy_ledger(id) ON DELETE CASCADE,
 receipt_id uuid NOT NULL UNIQUE
   REFERENCES public.beta_item_provenance_receipts(receipt_id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,request_id)
);
CREATE INDEX IF NOT EXISTS beta_forge_shadow_operations_recent
 ON public.beta_forge_shadow_operations(user_id,created_at DESC);

ALTER TABLE public.beta_forge_shadow_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_forge_shadow_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_forge_shadow_materials,
 public.beta_forge_shadow_operations FROM PUBLIC,anon,authenticated;

-- Quote versionat; bazat pe itemul determinist SQL36.
-- Pentru r>0, prefixul/sufixul costa n=2+floor(level/5) bucati.
-- Materialul de raritate este jwf/jwb/esf + calitate, cantitatea r.
-- Epic reusit cere 5 fragmente; nu se modeleaza esecul sau timpul forge.
-- In client bijuteriile de raritate >0 folosesc alta lista de prefixe
-- la COST fata de lista de afixe: respingem acest caz, nu ghicim plata.
CREATE OR REPLACE FUNCTION public.beta_forge_shadow_quote_v1(
 p_type text,p_level integer,p_rarity integer,p_quality integer,
 p_template text,p_seed bigint
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $quote$
DECLARE
 v_item jsonb;
 v_mats jsonb:='{}'::jsonb;
 v_n bigint;
 v_code text;
 v_ore bigint;
 v_i integer;
 v_base numeric;
BEGIN
 IF p_level IS NULL OR p_rarity IS NULL OR p_quality IS NULL
    OR p_type IS NULL OR p_template IS NULL OR p_seed IS NULL
    OR p_type='j' AND p_rarity>0 THEN
   RAISE EXCEPTION 'Reteta shadow este incompleta sau neacoperita.';
 END IF;
 v_item:=public.beta_item_replay_model_v1(
   p_type,p_level,p_rarity,p_quality,p_template,p_seed);
 v_base := CASE p_rarity
   WHEN 0 THEN 3 WHEN 1 THEN 6 WHEN 2 THEN 10 ELSE 16 END;
 v_ore:=round(v_base*(1+p_level*0.3))::bigint;
 v_n:=2+(p_level/5); -- diviziune intreaga pentru nivel pozitiv

 IF p_rarity>=1 THEN
   FOR v_i IN 0..(CASE WHEN p_rarity>=2 THEN 1 ELSE 0 END) LOOP
     v_code:=v_item->'m'->>v_i;
     IF v_code IS NULL OR v_code NOT IN
       ('zim','sng','bli','cal','vul','pra','rab','izv',
         'pia','ven','fie','cen','osn') THEN
       RAISE EXCEPTION 'Afix fara material valid; nu se debiteaza shadow.';
     END IF;
     v_mats:=jsonb_set(v_mats,ARRAY[v_code],
       to_jsonb(coalesce((v_mats->>v_code)::bigint,0)+v_n),true);
   END LOOP;
   v_code := (CASE p_rarity
       WHEN 1 THEN 'jwf' WHEN 2 THEN 'jwb' ELSE 'esf' END)
       ||p_quality::text;
   v_mats:=jsonb_set(v_mats,ARRAY[v_code],to_jsonb(p_rarity),true);
 END IF;
 IF p_rarity=3 THEN v_mats:=jsonb_set(
   v_mats,'{frag}','5'::jsonb,true);
 END IF;
 RETURN jsonb_build_object(
   'mode','shadow','ore_cost',v_ore,'gold_cost',0,
   'materials',v_mats,'item',v_item);
END
$quote$;

-- NUMAI apel dintr-un proces server-side de incredere (service role /
-- Postgres), cu identitate si nivel verificate independent de game_saves.
-- Intentional fara GRANT authenticated; si un grant accidental este oprit
-- daca requestul are auth.uid() ori rol autenticat/anon.
-- NU este folosit de butonul Forjeaza din joc; acela ramane legacy.
CREATE OR REPLACE FUNCTION public.beta_forge_shadow_commit_internal(
 p_user uuid,p_request_id uuid,
 p_type text,p_level integer,p_rarity integer,p_quality integer,
 p_template text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $craft$
DECLARE
 v_account public.beta_economy_accounts%ROWTYPE;
 v_previous public.beta_forge_shadow_operations%ROWTYPE;
 v_quote jsonb;
 v_item jsonb;
 v_materials jsonb;
 v_ore bigint;
 v_code text;
 v_need bigint;
 v_have bigint;
 v_event_key text;
 v_ledger_id bigint;
 v_receipt uuid;
 v_seed bigint;
BEGIN
 IF auth.uid() IS NOT NULL
    OR coalesce(auth.role(),'') NOT IN ('','service_role') THEN
    RAISE EXCEPTION 'Forjarea shadow nu poate fi apelata din sesiuni de jucator.';
 END IF;
 IF p_user IS NULL OR p_request_id IS NULL
    OR p_type IS NULL OR p_level IS NULL OR p_rarity IS NULL
    OR p_quality IS NULL OR p_template IS NULL THEN
    RAISE EXCEPTION 'Parametri forjare incompleti.';
 END IF;
 IF NOT EXISTS(
    SELECT 1 FROM public.beta_admins WHERE user_id=p_user
 ) THEN RAISE EXCEPTION 'Forjare permisa doar pentru conturi BETA autorizate.'; END IF;

 INSERT INTO public.beta_economy_accounts(user_id)
 VALUES(p_user) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO STRICT v_account FROM public.beta_economy_accounts
 WHERE user_id=p_user FOR UPDATE;
 IF v_account.state<>'shadow' THEN
    RAISE EXCEPTION 'SQL37 ruleaza exclusiv pe registrul SHADOW.';
 END IF;

 -- Lockul de pe cont serializeaza cererile simultane, inclusiv acelasi ID.
 SELECT * INTO v_previous FROM public.beta_forge_shadow_operations
 WHERE user_id=p_user AND request_id=p_request_id;
 IF FOUND THEN
   IF v_previous.item_type IS DISTINCT FROM p_type
      OR v_previous.item_level IS DISTINCT FROM p_level
      OR v_previous.item_rarity IS DISTINCT FROM p_rarity
      OR v_previous.item_quality IS DISTINCT FROM p_quality
      OR v_previous.template_key IS DISTINCT FROM p_template THEN
      RAISE EXCEPTION 'Request ID de forjare refolosit cu alta reteta.';
   END IF;
   RETURN jsonb_build_object('ok',true,'already',true,'mode','shadow',
      'receipt_id',v_previous.receipt_id,
      'item',public.beta_item_replay_receipt_v1(v_previous.receipt_id),
      'ore_cost',v_previous.ore_cost,
      'materials',v_previous.material_costs);
 END IF;

 -- Seed creat ABIA pe server, numai dupa excluderea retry-urilor.
 -- UUID aleator criptografic, 60 biti superiori convertiti in BIGINT pozitiv.
 v_seed:=(('x'||substr(replace(pg_catalog.gen_random_uuid()::text,'-',''),1,15))
          ::bit(60)::bigint);
 v_quote:=public.beta_forge_shadow_quote_v1(
    p_type,p_level,p_rarity,p_quality,p_template,v_seed);
 v_item:=v_quote->'item';
 v_materials:=v_quote->'materials';
 v_ore:=(v_quote->>'ore_cost')::bigint;
 IF v_account.ore<v_ore THEN
   RAISE EXCEPTION 'Minereu SHADOW insuficient; soldul local nu este acceptat.';
 END IF;

 -- Materialele sunt private, cu solduri independente de game_saves.
 -- Verificare totala INAINTE de debitarea economiei, cu lock pe cont.
 FOR v_code,v_need IN
   SELECT key,value::text::bigint FROM jsonb_each(v_materials)
   ORDER BY key
 LOOP
   SELECT balance INTO v_have FROM public.beta_forge_shadow_materials
   WHERE user_id=p_user AND material_code=v_code FOR UPDATE;
   IF coalesce(v_have,0)<v_need THEN
      RAISE EXCEPTION 'Material SHADOW insuficient: %',v_code;
   END IF;
 END LOOP;

 -- Orice exceptie ulterioara face ROLLBACK si al debitului, si al receiptului.
 -- SQL25 refuza duplicatele, iar cheia este derivata din UUID-ul cererii.
 v_event_key:='forge-shadow:'||p_request_id::text;
 PERFORM public.beta_economy_apply_internal(
    p_user,v_event_key,'forge_verified',0,-v_ore,0);
 SELECT id INTO STRICT v_ledger_id FROM public.beta_economy_ledger
 WHERE user_id=p_user AND event_key=v_event_key;

 FOR v_code,v_need IN
   SELECT key,value::text::bigint FROM jsonb_each(v_materials)
   ORDER BY key
 LOOP
   UPDATE public.beta_forge_shadow_materials SET
     balance=balance-v_need,updated_at=now()
   WHERE user_id=p_user AND material_code=v_code AND balance>=v_need;
   IF NOT FOUND THEN RAISE EXCEPTION 'Sold SHADOW schimbat in timpul debitarii.'; END IF;
 END LOOP;

 INSERT INTO public.beta_item_provenance_receipts(
    event_ledger_id,event_item_number,template_key,
    item_type,item_level,item_rarity,item_quality,server_roll_seed
 ) VALUES(
    v_ledger_id,1,p_template,
    p_type,p_level,p_rarity,p_quality,v_seed
 ) RETURNING receipt_id INTO v_receipt;

 INSERT INTO public.beta_forge_shadow_operations(
   user_id,request_id,item_type,item_level,item_rarity,item_quality,
   template_key,ore_cost,material_costs,event_ledger_id,receipt_id
 ) VALUES(
   p_user,p_request_id,p_type,p_level,p_rarity,p_quality,
   p_template,v_ore,v_materials,v_ledger_id,v_receipt
 );

 RETURN jsonb_build_object('ok',true,'already',false,'mode','shadow',
    'receipt_id',v_receipt,'ore_cost',v_ore,
    'materials',v_materials,'item',v_item);
END
$craft$;

REVOKE ALL ON FUNCTION public.beta_forge_shadow_quote_v1(
 text,integer,integer,integer,text,bigint)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.beta_forge_shadow_commit_internal(
 uuid,uuid,text,integer,integer,integer,text)
 FROM PUBLIC,anon,authenticated;
COMMIT;

-- Verificari structurale READ-ONLY; 9/9 true dovedesc schema, NU QA de craft.
SELECT
 to_regclass('public.beta_forge_shadow_materials') IS NOT NULL
   AS private_materials_exist,
 to_regclass('public.beta_forge_shadow_operations') IS NOT NULL
   AS private_operations_exist,
 coalesce((SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_forge_shadow_materials')),false)
   AS material_rls_enabled,
 coalesce((SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_forge_shadow_operations')),false)
   AS operations_rls_enabled,
 NOT has_table_privilege('authenticated',
   'public.beta_forge_shadow_materials','UPDATE')
   AND NOT has_table_privilege('authenticated',
   'public.beta_forge_shadow_operations','INSERT')
   AS direct_spend_denied,
 NOT has_function_privilege('authenticated',
   'public.beta_forge_shadow_commit_internal(uuid,uuid,text,integer,integer,integer,text)',
   'EXECUTE') AS forge_not_callable_by_players,
 NOT has_function_privilege('anon',
   'public.beta_forge_shadow_commit_internal(uuid,uuid,text,integer,integer,integer,text)',
   'EXECUTE') AS forge_not_callable_by_anon,
 (public.beta_forge_shadow_quote_v1('w',10,0,0,'sab',12)->>'ore_cost')::bigint=12
   AND (public.beta_forge_shadow_quote_v1('w',10,0,0,'sab',12)->'materials')='{}'::jsonb
   AS basic_quote_fixture,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.beta_item_provenance_receipts'::regclass
     AND tgname='beta_item_provenance_source_guard'
     AND NOT tgisinternal AND tgenabled<>'D')
   AS sql35_guard_preserved;

-- Fara ID-uri si fara modificarile de date: asteptat 0 operatiuni si 0
-- materiale finantate pana cand exista un emitent de resurse server-side.
SELECT
 (SELECT count(*) FROM public.beta_forge_shadow_operations)::bigint
    AS forge_shadow_operations,
 (SELECT count(*) FROM public.beta_forge_shadow_materials)::bigint
    AS material_rows,
 (SELECT count(*) FROM public.beta_item_provenance_receipts)::bigint
    AS total_receipts;
