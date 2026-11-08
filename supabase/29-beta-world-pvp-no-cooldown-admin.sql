-- Silver Throne · SQL29 / BETA · optiune PvP fara cooldown intre aceleasi sate.
-- RULEAZA MANUAL numai in Supabase Silver-Throne-Test. NU LIVE.
-- SQL28 este independent: poate fi instalat inainte sau dupa SQL29.
-- Disponibil EXCLUSIV utilizatorilor autorizati in beta_admins.
-- Optiunea este OPRITA implicit, persistata pe cont si reversibila din UI.
-- ELIMINA NUMAI pauza pe acelasi adversar; energia, nivelul minim,
-- un singur raid deschis si rezultatele ramân verificate ca inainte.
-- Nu sterge raiduri, nu reface cooldownuri si nu reseteaza progresul.
BEGIN;

DO $prerequisites$
DECLARE
  v_definition text;
BEGIN
 IF to_regclass('public.world_players') IS NULL
    OR to_regclass('public.world_raids') IS NULL
    OR to_regclass('public.beta_world_combat_shadow') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regclass('public.beta_admins') IS NULL
    OR to_regprocedure('public.world_raid_start(uuid)') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
   RAISE EXCEPTION 'SQL29 necesita Lume BETA, SQL22 si SQL26 instalate.';
 END IF;
 SELECT pg_get_functiondef(to_regprocedure('public.world_raid_start(uuid)'))
   INTO v_definition;
 IF position('same_h' IN coalesce(v_definition,''))=0
    OR position('world_close_stale' IN coalesce(v_definition,''))=0
    OR position('world_en' IN coalesce(v_definition,''))=0 THEN
   RAISE EXCEPTION 'world_raid_start este diferita de versiunea asteptata. Nu se suprascrie.';
 END IF;
END
$prerequisites$;

CREATE TABLE IF NOT EXISTS public.beta_world_raid_test_settings (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beta_world_raid_test_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_world_raid_test_settings
  FROM PUBLIC, anon, authenticated;

-- Configurare personala accesibila doar administratorilor BETA.
-- p_enabled=NULL -> citire; true/false -> activare/dezactivare.
CREATE OR REPLACE FUNCTION public.beta_world_raid_test_mode(
 p_enabled boolean DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $mode$
DECLARE
 v_uid uuid := auth.uid();
 v_enabled boolean := false;
BEGIN
 IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
   RAISE EXCEPTION 'Optiune disponibila doar administratorilor BETA.';
 END IF;
 IF p_enabled IS NOT NULL THEN
   INSERT INTO public.beta_world_raid_test_settings(user_id,enabled,updated_at)
     VALUES(v_uid,p_enabled,now())
   ON CONFLICT(user_id) DO UPDATE
     SET enabled=EXCLUDED.enabled,updated_at=now();
 END IF;
 SELECT coalesce((SELECT s.enabled
   FROM public.beta_world_raid_test_settings s
   WHERE s.user_id=v_uid),false) INTO v_enabled;
 RETURN jsonb_build_object(
   'enabled',v_enabled,'beta_only',true,
   'bypasses_same_opponent_cooldown',v_enabled,
   'energy_unchanged',true);
END
$mode$;

-- Aceeasi logica world_raid_start din SQL02, cu unica exceptie:
-- daca administratorul si-a activat explicit modul de test,
-- se ignora doar cooldownul dintre acelasi atacator si acelasi sat.
-- Schema calificata si search_path gol pentru SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.world_raid_start(p_target uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $raid$
DECLARE
 v_uid uuid := auth.uid();
 v_cfg jsonb := public.world_cfg();
 v_me public.world_players%ROWTYPE;
 v_target public.world_players%ROWTYPE;
 v_en real;
 v_last timestamptz;
 v_id bigint;
 v_mins integer;
 v_bypass boolean := false;
BEGIN
 IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
   RAISE EXCEPTION 'Acces BETA neautorizat.';
 END IF;
 PERFORM public.world_close_stale(v_uid);
 SELECT * INTO v_me FROM public.world_players
   WHERE user_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Intră întâi în Lume.'; END IF;
 IF v_me.level < (v_cfg->>'min_level')::integer THEN
   RAISE EXCEPTION 'Poți ataca alți jucători de la nivelul %.',v_cfg->>'min_level';
 END IF;
 IF p_target=v_uid THEN
   RAISE EXCEPTION 'Nu-ți poți ataca propriul sat.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.world_raids r
           WHERE r.attacker=v_uid AND r.finished_at IS NULL) THEN
   RAISE EXCEPTION 'Ai deja un atac în curs.';
 END IF;
 SELECT * INTO v_target FROM public.world_players
   WHERE user_id=p_target;
 IF NOT FOUND THEN RAISE EXCEPTION 'Jucătorul nu mai există.'; END IF;
 IF v_target.level < (v_cfg->>'min_level')::integer THEN
   RAISE EXCEPTION '% e încă începător (sub nivelul %) și e protejat.',
     v_target.name,v_cfg->>'min_level';
 END IF;
 SELECT coalesce((SELECT s.enabled
   FROM public.beta_world_raid_test_settings s
   WHERE s.user_id=v_uid),false) INTO v_bypass;
 IF NOT v_bypass THEN
   SELECT max(r.started_at) INTO v_last FROM public.world_raids r
     WHERE r.attacker=v_uid AND r.defender=p_target;
   IF v_last IS NOT NULL
      AND v_last>now()-make_interval(hours=>(v_cfg->>'same_h')::integer) THEN
     v_mins:=ceil(extract(epoch FROM (
       v_last+make_interval(hours=>(v_cfg->>'same_h')::integer)-now()
     ))/60);
     RAISE EXCEPTION 'L-ai atacat recent pe %. Poți din nou peste % h % min.',
       v_target.name,v_mins/60,v_mins%60;
   END IF;
 END IF;
 v_en:=public.world_en(v_me.en,v_me.en_t);
 IF v_en<1 THEN
   v_mins:=ceil((1-v_en)*(v_cfg->>'en_regen_min')::real);
   RAISE EXCEPTION 'Nu mai ai atacuri. Următorul se reface în % min.',v_mins;
 END IF;
 UPDATE public.world_players
   SET en=v_en-1,en_t=now() WHERE user_id=v_uid;
 INSERT INTO public.world_raids(attacker,defender)
   VALUES(v_uid,p_target) RETURNING id INTO v_id;
 RETURN jsonb_build_object(
   'id',v_id,'name',v_target.name,'level',v_target.level,
   'units',v_target.units,'hero',v_target.hero,'en',v_en-1,
   'test_cooldown_bypass',v_bypass);
END
$raid$;

REVOKE ALL ON FUNCTION public.beta_world_raid_test_mode(boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.beta_world_raid_test_mode(boolean)
  TO authenticated;
REVOKE ALL ON FUNCTION public.world_raid_start(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.world_raid_start(uuid)
  TO authenticated;

COMMIT;

-- READ ONLY: toate sase valori ar trebui sa fie true.
SELECT
 to_regclass('public.beta_world_raid_test_settings') IS NOT NULL
   AS settings_table_exists,
 coalesce((SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_world_raid_test_settings')),false)
   AS settings_rls_enabled,
 has_function_privilege('authenticated',
   'public.beta_world_raid_test_mode(boolean)','EXECUTE')
   AS test_mode_rpc_callable,
 coalesce(position('v_bypass' IN pg_get_functiondef(
   to_regprocedure('public.world_raid_start(uuid)')))>0,false)
   AS raid_start_respects_test_mode,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_raids'::regclass
     AND tgname='beta_economy_world_raid_started'
     AND NOT tgisinternal)
   AS sql26_ledger_trigger_preserved,
 NOT has_table_privilege('authenticated',
   'public.beta_world_raid_test_settings','UPDATE')
   AS direct_settings_write_denied;
