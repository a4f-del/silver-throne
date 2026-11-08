-- Silver Throne / SQL36 / BETA / pasul 33 - reconstrucția deterministă a obiectelor SQL35.
-- DOAR Silver-Throne-Test, MANUAL dupa SQL35. NICIODATA LIVE.
-- Nu emite obiecte, nu importă inventarul clientului, nu atinge conturi,
-- resurse, salvări, recompense, PvP, Tron sau echiparea.
-- Generatorul recreează statisticile mkItem pentru un roll CANONIC, ales
-- determinist dintr-un seed aflat în receiptul PRIVAT. Nu pretinde că
-- reproduce alegerile aleatoare sau forjările istorice din browser.
BEGIN;

DO $preflight$
BEGIN
 IF to_regclass('public.beta_item_provenance_receipts') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regprocedure('public.beta_item_provenance_guard()') IS NULL THEN
   RAISE EXCEPTION 'SQL36 necesită fundația SQL35 în Silver-Throne-Test.';
 END IF;
 IF coalesce((SELECT NOT relrowsecurity FROM pg_class
     WHERE oid='public.beta_item_provenance_receipts'::regclass),true)
    OR has_table_privilege('authenticated',
       'public.beta_item_provenance_receipts','SELECT')
    OR has_table_privilege('authenticated',
       'public.beta_item_provenance_receipts','INSERT')
    OR has_table_privilege('anon',
       'public.beta_item_provenance_receipts','SELECT') THEN
   RAISE EXCEPTION 'SQL36: receipturile SQL35 trebuie să rămână private.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.beta_item_provenance_receipts'::regclass
     AND tgname='beta_item_provenance_source_guard'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) THEN
   RAISE EXCEPTION 'SQL36: guardul de proveniență SQL35 nu este activ.';
 END IF;
END
$preflight$;

-- Copie înghețată a afixelor curente mkItem din index.html.
-- Orice schimbare de balans necesită o nouă versiune + teste de paritate.
CREATE OR REPLACE FUNCTION public.beta_item_affix_catalog_v1(p_pool text)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=''
AS $catalog$
 SELECT CASE p_pool
    WHEN 'PW' THEN '[{"n":"Zimțat","dmg":3,"m":"zim"},{"n":"Sângeros","bleed":30,"m":"sng"},{"n":"Străjuitor","dmg":2,"vd":4,"m":"pia"},{"n":"Ascuțit","lv":6,"dmg":2,"crit":6,"m":"fie"},{"n":"Otrăvit","lv":12,"dmg":2,"bleed":45,"m":"ven"},{"n":"Pustiitor","lv":20,"dmg":6,"pd":4,"m":"cen"},{"n":"Fărâmător","lv":30,"dmg":5,"pd":8,"crit":4,"m":"osn"},{"n":"Sfâșietor","lv":16,"dmg":3,"bleed":35,"m":"sng"},{"n":"Nimicitor","lv":40,"dmg":8,"pd":10,"crit":6,"m":"cen"}]'::jsonb
    WHEN 'PA' THEN '[{"n":"Blindat","def":2,"m":"bli"},{"n":"Călit","hp":10,"m":"cal"},{"n":"Fortificat","def":1,"vd":5,"m":"pia"},{"n":"Masiv","lv":8,"hp":14,"def":1,"m":"fie"},{"n":"Întărit","lv":14,"def":3,"pf":3,"m":"fie"},{"n":"Vindecător","lv":18,"hp":8,"heal":12,"m":"izv"},{"n":"Neînduplecat","lv":28,"def":4,"pf":6,"ph":4,"m":"cen"},{"n":"Oțelit","lv":22,"def":4,"hp":12,"m":"bli"},{"n":"Inexpugnabil","lv":40,"def":6,"pf":9,"ph":6,"m":"cen"}]'::jsonb
    WHEN 'PJ' THEN '[{"n":"Fermecat","crit":5},{"n":"Strălucitor","bleed":20},{"n":"Ocrotitor","vd":6},{"n":"Înstărit","lv":6,"loot":12},{"n":"Izvorât","lv":10,"heal":10},{"n":"Regal","lv":25,"pd":5,"ph":5},{"n":"Vrăjit","lv":15,"crit":8,"heal":8},{"n":"Imperial","lv":40,"pd":8,"ph":8,"pf":4}]'::jsonb
    WHEN 'SF' THEN '[{"n":"al Vulturului","crit":10,"m":"vul"},{"n":"al Prăzii","loot":20,"m":"pra"},{"n":"al Răbdării","hp":6,"m":"rab"},{"n":"al Izvorului","heal":20,"m":"izv"},{"n":"al Zidarului","vd":8,"m":"pia"},{"n":"al Lupului","lv":5,"dmg":2,"crit":5,"m":"osn"},{"n":"al Titanului","lv":10,"hp":12,"ph":3,"m":"fie"},{"n":"al Furiei","lv":15,"dmg":3,"bleed":20,"m":"sng"},{"n":"al Păzitorului","lv":20,"def":3,"pf":4,"m":"bli"},{"n":"al Eternității","lv":35,"pd":6,"ph":6,"pf":6,"m":"cen"},{"n":"al Săgeții","lv":12,"crit":12,"pd":2,"m":"vul"},{"n":"al Lunii","lv":25,"heal":30,"ph":3,"m":"izv"},{"n":"al Zeilor","lv":42,"pd":8,"ph":8,"pf":8,"heal":15,"m":"cen"}]'::jsonb
    ELSE '[]'::jsonb
 END
$catalog$;

-- Selecție reproductibilă: 32 biți nesemnați din MD5(seed:salt), modulo N.
-- Numai o alegere de catalog; NU un RNG sigur pentru un premiu competitiv.
-- Seedul trebuie emis de un backend de încredere, nu furnizat de browser.
CREATE OR REPLACE FUNCTION public.beta_item_roll_index_v1(
 p_seed bigint,p_salt text,p_count integer
) RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $pick$
BEGIN
 IF p_seed IS NULL OR p_seed<0 OR p_salt IS NULL
    OR p_count IS NULL OR p_count<1 OR p_count>1024 THEN
   RAISE EXCEPTION 'Roll invalid pentru catalog.';
 END IF;
 RETURN ((('x'||substr(md5(p_seed::text||':'||p_salt),1,8))::bit(32)::bigint)
           % p_count)::integer;
END
$pick$;

-- Contract: template_key = wf (sab/top/arc/buz/toi/sce) pentru arme;
-- template_key = tip (a,h,b,j,r) pentru restul.
-- Rezultatul are forma exactă {t,l,r,q,name,s,m,wf?} din mkItem BETA,
-- cu indexuri de afixe NUMAI din cele disponibile la nivelul obiectului.
CREATE OR REPLACE FUNCTION public.beta_item_replay_model_v1(
 p_type text,p_level integer,p_rarity integer,p_quality integer,
 p_template text,p_seed bigint
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $item$
DECLARE
 v_stats jsonb := '{"dmg":0,"def":0,"hp":0,"bleed":0,"crit":0,"loot":0,"heal":0,"vd":0,"pd":0,"ph":0,"pf":0}'::jsonb;
 v_multiplier numeric;
 v_weapon_mult numeric := 1;
 v_name text;
 v_base_names jsonb;
 v_prefix_pool jsonb;
 v_suffix_pool jsonb;
 v_prefix jsonb;
 v_suffix jsonb;
 v_affix jsonb;
 v_k text;
 v_raw numeric;
 v_kk text;
 v_val integer;
 v_mats jsonb := '[]'::jsonb;
 v_n integer;
BEGIN
 IF p_type IS NULL OR p_level IS NULL OR p_rarity IS NULL
    OR p_quality IS NULL OR p_template IS NULL
    OR p_type NOT IN ('w','a','h','b','j','r')
    OR p_level NOT BETWEEN 1 AND 500
    OR p_rarity NOT BETWEEN 0 AND 3
    OR p_quality NOT BETWEEN 0 AND 4
    OR p_seed IS NULL OR p_seed<0 THEN
   RAISE EXCEPTION 'Parametri item invalizi pentru modelul server.';
 END IF;
 IF (p_type='w' AND p_template NOT IN ('sab','top','arc','buz','toi','sce'))
    OR (p_type<>'w' AND p_template<>p_type) THEN
   RAISE EXCEPTION 'Template incompatibil cu tipul obiectului.';
 END IF;

 v_multiplier := (CASE p_rarity WHEN 0 THEN 1 WHEN 1 THEN 1.1
      WHEN 2 THEN 1.2 ELSE 1.4 END)*(1+p_quality*0.1);
 IF p_type='w' THEN
   v_name := CASE p_template
     WHEN 'sab' THEN 'Sabie' WHEN 'top' THEN 'Topor'
     WHEN 'arc' THEN 'Arc' WHEN 'buz' THEN 'Buzdugan'
     WHEN 'toi' THEN 'Toiag' ELSE 'Sceptru' END;
   v_weapon_mult := CASE p_template
     WHEN 'top' THEN 1.15 WHEN 'arc' THEN .95
     WHEN 'buz' THEN .8 WHEN 'toi' THEN 1.1
     WHEN 'sce' THEN .7 ELSE 1 END;
   v_stats:=jsonb_set(v_stats,'{dmg}',
       to_jsonb(round((2+p_level*1.4)*v_multiplier*v_weapon_mult)::integer));
   IF p_template='sab' THEN
     v_stats:=jsonb_set(v_stats,'{crit}','6'::jsonb);
   ELSIF p_template='top' THEN
     v_stats:=v_stats||'{"bleed":15,"crit":-3}'::jsonb;
   ELSIF p_template='arc' THEN
     v_stats:=v_stats||'{"crit":10,"ph":-5}'::jsonb;
   ELSIF p_template='buz' THEN
     v_stats:=v_stats||jsonb_build_object(
       'def',round(p_level::numeric/5*v_multiplier)::integer,
       'hp',round(p_level::numeric*.8*v_multiplier)::integer);
   ELSIF p_template='toi' THEN
     v_stats:=v_stats||'{"pd":8,"ph":-8}'::jsonb;
   ELSE
     v_stats:=jsonb_set(v_stats,'{heal}',
       to_jsonb(round(2*p_level*v_multiplier)::integer));
   END IF;
 ELSIF p_type='j' THEN
   v_stats:=jsonb_set(v_stats,'{hp}',
      to_jsonb(round(2*p_level*v_multiplier)::integer));
 ELSIF p_type='h' THEN
   v_stats:=v_stats||jsonb_build_object(
     'def',round((1+p_level*.4)*v_multiplier)::integer,
     'hp',round(2*p_level*v_multiplier)::integer);
 ELSIF p_type='b' THEN
   v_stats:=v_stats||jsonb_build_object(
     'hp',round(2.5*p_level*v_multiplier)::integer,
     'def',round((.5+p_level*.25)*v_multiplier)::integer);
 ELSE
   v_stats:=v_stats||jsonb_build_object(
     'def',round((1+p_level*.7)*v_multiplier)::integer,
     'hp',round(3*p_level*v_multiplier)::integer);
 END IF;

 IF p_type<>'w' THEN
   v_base_names:=CASE p_type
     WHEN 'j' THEN '["Inel","Amuletă","Brățară"]'::jsonb
     WHEN 'h' THEN '["Coif","Cască","Coroană de fier"]'::jsonb
     WHEN 'b' THEN '["Cizme","Cizme întărite","Jambiere"]'::jsonb
     ELSE '["Pieptar","Cămașă de zale","Scut-pieptar"]'::jsonb END;
   v_name:=v_base_names->>public.beta_item_roll_index_v1(
      p_seed,'name',jsonb_array_length(v_base_names));
 END IF;

 IF p_rarity>=1 THEN
   v_prefix_pool:=public.beta_item_affix_catalog_v1(
       CASE p_type WHEN 'w' THEN 'PW' WHEN 'j' THEN 'PJ' ELSE 'PA' END);
   SELECT coalesce(jsonb_agg(a.item ORDER BY a.ord),'[]'::jsonb)
   INTO v_prefix_pool
   FROM jsonb_array_elements(v_prefix_pool) WITH ORDINALITY a(item,ord)
   WHERE coalesce((a.item->>'lv')::integer,1)<=p_level;
   v_prefix:=v_prefix_pool->public.beta_item_roll_index_v1(
      p_seed,'prefix',jsonb_array_length(v_prefix_pool));
   v_name:=v_prefix->>'n'||' '||v_name;
   IF v_prefix ? 'm' THEN
      v_mats:=v_mats||jsonb_build_array(v_prefix->>'m');
   END IF;
 END IF;
 IF p_rarity>=2 THEN
   v_suffix_pool:=public.beta_item_affix_catalog_v1('SF');
   SELECT coalesce(jsonb_agg(a.item ORDER BY a.ord),'[]'::jsonb)
   INTO v_suffix_pool
   FROM jsonb_array_elements(v_suffix_pool) WITH ORDINALITY a(item,ord)
   WHERE coalesce((a.item->>'lv')::integer,1)<=p_level;
   v_suffix:=v_suffix_pool->public.beta_item_roll_index_v1(
      p_seed,'suffix',jsonb_array_length(v_suffix_pool));
   v_name:=v_name||' '||v_suffix->>'n';
   IF v_suffix ? 'm' THEN
      v_mats:=v_mats||jsonb_build_array(v_suffix->>'m');
   END IF;
 END IF;

 -- BETA mkItem traduce bonusul de apărare sat (vd) în DEF /4.
 FOR v_affix IN SELECT x FROM (VALUES(v_prefix),(v_suffix)) v(x)
   WHERE x IS NOT NULL LOOP
   FOR v_k,v_raw IN
      SELECT key,value::text::numeric
      FROM jsonb_each(v_affix)
      WHERE key NOT IN ('n','m','lv')
   LOOP
     v_kk:=CASE WHEN v_k='vd' THEN 'def' ELSE v_k END;
     IF v_k='vd' THEN
       v_raw:=greatest(1,round(v_raw/4));
     END IF;
     IF v_kk IN ('dmg','def','hp') THEN
       v_val:=round(v_raw*(1+p_level*.15))::integer;
     ELSE
       v_val:=v_raw::integer;
     END IF;
     v_stats:=jsonb_set(v_stats,ARRAY[v_kk],
       to_jsonb((v_stats->>v_kk)::integer+v_val));
   END LOOP;
 END LOOP;

 IF p_type='w' THEN
   RETURN jsonb_build_object(
      't',p_type,'l',p_level,'r',p_rarity,'q',p_quality,
      'name',v_name,'s',v_stats,'m',v_mats,'wf',p_template);
 END IF;
 RETURN jsonb_build_object(
    't',p_type,'l',p_level,'r',p_rarity,'q',p_quality,
    'name',v_name,'s',v_stats,'m',v_mats);
END
$item$;

-- Cale exclusiv server-side: ia parametrii doar dintr-un receipt SQL35.
-- Fara ID valid => eroare, niciodata item construit din cererea clientului.
CREATE OR REPLACE FUNCTION public.beta_item_replay_receipt_v1(p_receipt uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $read$
DECLARE v_receipt public.beta_item_provenance_receipts%ROWTYPE;
BEGIN
 IF p_receipt IS NULL THEN
   RAISE EXCEPTION 'Receipt obligatoriu.';
 END IF;
 SELECT * INTO v_receipt
 FROM public.beta_item_provenance_receipts
 WHERE receipt_id=p_receipt;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Receipt inexistent.';
 END IF;
 RETURN public.beta_item_replay_model_v1(
   v_receipt.item_type,v_receipt.item_level,v_receipt.item_rarity,
   v_receipt.item_quality,v_receipt.template_key,
   v_receipt.server_roll_seed);
END
$read$;

REVOKE ALL ON FUNCTION public.beta_item_affix_catalog_v1(text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.beta_item_roll_index_v1(bigint,text,integer)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.beta_item_replay_model_v1(text,integer,integer,integer,text,bigint)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.beta_item_replay_receipt_v1(uuid)
 FROM PUBLIC,anon,authenticated;

COMMIT;

-- Doar verificari structurale si fixture-uri publice, niciun cont.
-- Toate 9 TRUE; NU atesta provenienta obiectelor deja existente.
SELECT
 to_regprocedure('public.beta_item_replay_receipt_v1(uuid)') IS NOT NULL
    AS receipt_replay_exists,
 to_regprocedure('public.beta_item_replay_model_v1(text,integer,integer,integer,text,bigint)') IS NOT NULL
    AS replay_model_exists,
 NOT has_function_privilege('authenticated',
    'public.beta_item_replay_receipt_v1(uuid)','EXECUTE')
    AS receipt_replay_private,
 NOT has_function_privilege('authenticated',
    'public.beta_item_replay_model_v1(text,integer,integer,integer,text,bigint)','EXECUTE')
    AS raw_model_private,
 NOT has_function_privilege('authenticated',
    'public.beta_item_affix_catalog_v1(text)','EXECUTE')
    AND NOT has_function_privilege('authenticated',
    'public.beta_item_roll_index_v1(bigint,text,integer)','EXECUTE')
    AS generator_helpers_private,
 NOT has_table_privilege('authenticated','public.beta_item_provenance_receipts','SELECT')
    AS receipts_still_private,
 EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.beta_item_provenance_receipts'::regclass
      AND tgname='beta_item_provenance_source_guard'
      AND NOT tgisinternal AND tgenabled<>'D')
    AS sql35_guard_preserved,
 (public.beta_item_replay_model_v1('w',10,0,0,'sab',12)->'s'->>'dmg')::integer=16
    AND (public.beta_item_replay_model_v1('w',10,0,0,'sab',12)->'s'->>'crit')::integer=6
    AS common_sword_fixture,
 public.beta_item_replay_model_v1('w',20,3,2,'top',101)
    =public.beta_item_replay_model_v1('w',20,3,2,'top',101)
    AND (public.beta_item_replay_model_v1('a',6,2,1,'a',18)->>'name') IS NOT NULL
    AS deterministic_rare_fixtures;

-- Fara proiectarea itemelor personale; volum agregat doar.
SELECT COUNT(*)::bigint AS receipturi_inainte_de_emitent
FROM public.beta_item_provenance_receipts;
