-- Silver Throne · SQL27 · pas 33 · simulator PvP determinist in paralel.
-- DOAR Silver-Throne-Test (BETA), manual, dupa SQL21-26. NU LIVE.
-- Nu modifica world_raid_start/finish, portofelul, clasamentul, aurul sau XP.
-- Nu decide victoria efectiva. Echipele publicate sunt INCA din browser.
-- Motor orientativ v1: lovituri normale, fara abilitati/critice/echipament.
BEGIN;

DO $prereq$
BEGIN
 IF to_regclass('public.beta_world_combat_shadow') IS NULL
    OR to_regclass('public.world_raids') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regprocedure('public.world_units_ok(jsonb)') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
    RAISE EXCEPTION 'SQL27 necesita schema Lumii si migrarile BETA SQL22–26.';
 END IF;
END
$prereq$;

CREATE TABLE IF NOT EXISTS public.beta_world_combat_simulations(
 raid_id bigint PRIMARY KEY REFERENCES public.world_raids(id) ON DELETE CASCADE,
 engine_version integer NOT NULL DEFAULT 1 CHECK(engine_version=1),
 outcome text NOT NULL CHECK(outcome IN('attacker','defender','draw','unavailable')),
 predicted_attacker_win boolean,
 rounds integer NOT NULL DEFAULT 0 CHECK(rounds BETWEEN 0 AND 40),
 actions_count integer NOT NULL DEFAULT 0 CHECK(actions_count BETWEEN 0 AND 240),
 attacker_hp_left bigint NOT NULL DEFAULT 0 CHECK(attacker_hp_left>=0),
 defender_hp_left bigint NOT NULL DEFAULT 0 CHECK(defender_hp_left>=0),
 attacker_snapshot_md5 text NOT NULL,
 defender_snapshot_md5 text NOT NULL,
 generated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beta_world_combat_simulations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_world_combat_simulations
  FROM PUBLIC, anon, authenticated;

-- Function pure, reproducibila pentru acelasi raid si aceleasi echipe.
-- Ordinea primei ture este data de paritatea ID-ului raidului; fara RNG
-- ascuns. Fiecare echipa contine 1..3 luptatori, fiecare cu HP/ATK/DEF.
-- Fantoma apărătorului are multiplicatorul ATK 1.62 (precum clientul).
-- Nu modeleaza criticele, aptitudinile, vindecarile, sangerea sau itemele.
CREATE OR REPLACE FUNCTION public.beta_world_combat_shadow_simulate(
 p_attackers jsonb, p_defenders jsonb, p_raid_id bigint
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $sim$
DECLARE
 a_hp bigint[] := ARRAY[]::bigint[];
 d_hp bigint[] := ARRAY[]::bigint[];
 a_atk bigint[] := ARRAY[]::bigint[];
 d_atk bigint[] := ARRAY[]::bigint[];
 a_def bigint[] := ARRAY[]::bigint[];
 d_def bigint[] := ARRAY[]::bigint[];
 v_unit jsonb;
 v_round integer := 0;
 v_phase integer;
 v_i integer;
 v_j integer;
 v_target integer;
 v_damage bigint;
 v_actions integer := 0;
 v_attacker_turn boolean;
 v_attacker_first boolean;
 v_a_alive boolean;
 v_d_alive boolean;
 v_ah bigint := 0;
 v_dh bigint := 0;
 v_outcome text := 'draw';
BEGIN
 IF p_raid_id IS NULL
    OR NOT public.world_units_ok(p_attackers)
    OR NOT public.world_units_ok(p_defenders) THEN
   RETURN jsonb_build_object('outcome','unavailable',
     'predicted_attacker_win',null,'rounds',0,'actions',0,
     'attacker_hp_left',0,'defender_hp_left',0);
 END IF;

 FOR v_unit IN SELECT value FROM jsonb_array_elements(p_attackers) LOOP
   a_hp:=array_append(a_hp,round((v_unit->>'hp')::numeric)::bigint);
   a_atk:=array_append(a_atk,round((v_unit->>'atk')::numeric)::bigint);
   a_def:=array_append(a_def,round((v_unit->>'def')::numeric)::bigint);
 END LOOP;
 FOR v_unit IN SELECT value FROM jsonb_array_elements(p_defenders) LOOP
   d_hp:=array_append(d_hp,round((v_unit->>'hp')::numeric)::bigint);
   d_atk:=array_append(d_atk,round((v_unit->>'atk')::numeric*1.62)::bigint);
   d_def:=array_append(d_def,round((v_unit->>'def')::numeric)::bigint);
 END LOOP;
 v_attacker_first := mod(p_raid_id,2)=0;

 -- Un plafon de 40 ture, 2 faze/tura, max 3 lovituri/faza.
 -- Tinta este primul adversar viu, iar dauna e ATK - 35% DEF.
 FOR v_round IN 1..40 LOOP
   FOR v_phase IN 1..2 LOOP
     v_attacker_turn := (v_phase=1)=v_attacker_first;
     IF v_attacker_turn THEN
       FOR v_i IN 1..coalesce(array_length(a_hp,1),0) LOOP
         IF a_hp[v_i]<=0 THEN CONTINUE; END IF;
         v_target:=NULL;
         FOR v_j IN 1..coalesce(array_length(d_hp,1),0) LOOP
           IF d_hp[v_j]>0 THEN v_target:=v_j; EXIT; END IF;
         END LOOP;
         IF v_target IS NULL THEN EXIT; END IF;
         v_damage:=greatest(1,round(a_atk[v_i]-d_def[v_target]*0.35)::bigint);
         d_hp[v_target]:=greatest(0,d_hp[v_target]-v_damage);
         v_actions:=v_actions+1;
       END LOOP;
     ELSE
       FOR v_i IN 1..coalesce(array_length(d_hp,1),0) LOOP
         IF d_hp[v_i]<=0 THEN CONTINUE; END IF;
         v_target:=NULL;
         FOR v_j IN 1..coalesce(array_length(a_hp,1),0) LOOP
           IF a_hp[v_j]>0 THEN v_target:=v_j; EXIT; END IF;
         END LOOP;
         IF v_target IS NULL THEN EXIT; END IF;
         v_damage:=greatest(1,round(d_atk[v_i]-a_def[v_target]*0.35)::bigint);
         a_hp[v_target]:=greatest(0,a_hp[v_target]-v_damage);
         v_actions:=v_actions+1;
       END LOOP;
     END IF;
   END LOOP;
   SELECT EXISTS(SELECT 1 FROM unnest(a_hp) AS u(hp) WHERE u.hp>0)
     INTO v_a_alive;
   SELECT EXISTS(SELECT 1 FROM unnest(d_hp) AS u(hp) WHERE u.hp>0)
     INTO v_d_alive;
   EXIT WHEN NOT v_a_alive OR NOT v_d_alive;
 END LOOP;
 SELECT coalesce(sum(x),0)::bigint INTO v_ah FROM unnest(a_hp) AS u(x);
 SELECT coalesce(sum(x),0)::bigint INTO v_dh FROM unnest(d_hp) AS u(x);
 v_outcome:=CASE
   WHEN v_ah>0 AND v_dh=0 THEN 'attacker'
   WHEN v_dh>0 AND v_ah=0 THEN 'defender'
   ELSE 'draw'
 END;
 RETURN jsonb_build_object(
   'outcome',v_outcome,
   'predicted_attacker_win',CASE WHEN v_outcome='draw' THEN NULL
      ELSE v_outcome='attacker' END,
   'rounds',v_round,'actions',v_actions,
   'attacker_hp_left',v_ah,'defender_hp_left',v_dh);
END
$sim$;

-- Cand SQL22 captureaza echipele, genereaza in aceeasi tranzactie
-- simularea. Un eveniment de INSERT al unui raid nu asteapta verdictul
-- transmis ulterior de browser, deci nu poate fi influentat la finish.
CREATE OR REPLACE FUNCTION public.beta_world_combat_shadow_auto()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $auto$
DECLARE
 v_result jsonb;
BEGIN
 BEGIN
   v_result:=public.beta_world_combat_shadow_simulate(
     NEW.attacker_units,NEW.defender_units,NEW.raid_id);
   INSERT INTO public.beta_world_combat_simulations(
      raid_id,outcome,predicted_attacker_win,rounds,actions_count,
      attacker_hp_left,defender_hp_left,
      attacker_snapshot_md5,defender_snapshot_md5
   ) VALUES (
      NEW.raid_id,v_result->>'outcome',
      (v_result->>'predicted_attacker_win')::boolean,
      (v_result->>'rounds')::integer,
      (v_result->>'actions')::integer,
      (v_result->>'attacker_hp_left')::bigint,
      (v_result->>'defender_hp_left')::bigint,
      md5(NEW.attacker_units::text),md5(NEW.defender_units::text)
   ) ON CONFLICT (raid_id) DO NOTHING;
 EXCEPTION WHEN OTHERS THEN
   RAISE WARNING 'SQL27 BETA shadow combat failed for raid %: %',
     NEW.raid_id,SQLERRM;
 END;
 RETURN NEW;
END
$auto$;

DROP TRIGGER IF EXISTS beta_world_shadow_simulation_created
  ON public.beta_world_combat_shadow;
CREATE TRIGGER beta_world_shadow_simulation_created
AFTER INSERT ON public.beta_world_combat_shadow
FOR EACH ROW EXECUTE FUNCTION public.beta_world_combat_shadow_auto();

-- Un utilizator BETA poate cere doar propriul raport DUPA finalizarea
-- raidului; nu are acces direct la snapshoturile sau rapoartele altora.
CREATE OR REPLACE FUNCTION public.beta_world_combat_my_report(
 p_raid_id bigint
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $myreport$
DECLARE
 v_uid uuid:=auth.uid();
 v_raid public.world_raids%ROWTYPE;
 v_sim public.beta_world_combat_simulations%ROWTYPE;
BEGIN
 IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
   RAISE EXCEPTION 'Acces BETA neautorizat.';
 END IF;
 SELECT * INTO v_raid FROM public.world_raids
 WHERE id=p_raid_id AND attacker=v_uid AND finished_at IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Raport indisponibil.'; END IF;
 SELECT * INTO v_sim FROM public.beta_world_combat_simulations
 WHERE raid_id=p_raid_id;
 IF NOT FOUND THEN
   RETURN jsonb_build_object('available',false,'raid_id',p_raid_id);
 END IF;
 RETURN jsonb_build_object(
   'available',true,'raid_id',p_raid_id,
   'engine_version',v_sim.engine_version,'outcome',v_sim.outcome,
   'predicted_win',v_sim.predicted_attacker_win,
   'reported_win',v_raid.win,
   'matches_report',CASE WHEN v_sim.predicted_attacker_win IS NULL
       THEN NULL ELSE v_sim.predicted_attacker_win=v_raid.win END,
   'rounds',v_sim.rounds,
   'is_official_result',false);
END
$myreport$;

REVOKE ALL ON FUNCTION public.beta_world_combat_shadow_simulate(
  jsonb,jsonb,bigint
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_world_combat_shadow_auto()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_world_combat_my_report(bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.beta_world_combat_my_report(bigint)
  TO authenticated;

COMMIT;

-- Diagnostic read-only: toate sase valori trebuie sa fie true.
SELECT
  to_regclass('public.beta_world_combat_simulations') IS NOT NULL
    AS simulation_table_exists,
  coalesce((SELECT relrowsecurity FROM pg_class
    WHERE oid=to_regclass('public.beta_world_combat_simulations')),false)
    AS simulation_rls_enabled,
  EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.beta_world_combat_shadow'::regclass
    AND tgname='beta_world_shadow_simulation_created'
    AND NOT tgisinternal) AS simulator_trigger_exists,
  EXISTS(SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_raids'::regclass
    AND tgname='beta_world_shadow_raid_started'
    AND NOT tgisinternal) AS sql22_capture_preserved,
  NOT has_function_privilege(
    'authenticated',
    'public.beta_world_combat_shadow_simulate(jsonb,jsonb,bigint)',
    'EXECUTE') AS engine_private,
  has_function_privilege(
    'authenticated',
    'public.beta_world_combat_my_report(bigint)',
    'EXECUTE') AS own_report_callable;
