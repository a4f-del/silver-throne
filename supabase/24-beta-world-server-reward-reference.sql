-- Silver Throne · SQL 24 / BETA · Pas 33: valori competitive calculate pe server.
-- Ruleaza MANUAL numai in Supabase Silver-Throne-Test DUPA SQL 21, 22 si 23.
-- NU LIVE. Fara resetari, fara alterarea salvarilor, echipamentului ori resurselor.
-- Atentie: p_win si nivelurile echipei sunt INCA de origine client!
-- Acest script asigura sumele din JURNALUL raidurilor, nu portofelul game_saves.
-- Nu promova ca anti-cheat complet sau plata autoritativa de resurse.
BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.world_players') IS NULL
     OR to_regclass('public.world_raids') IS NULL
     OR to_regclass('public.beta_world_result_audit') IS NULL
     OR to_regclass('public.beta_world_combat_shadow') IS NULL
     OR to_regclass('public.beta_save_progress_audit') IS NULL
     OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
    RAISE EXCEPTION 'SQL24 necesita SQL21, SQL22, SQL23 si world_players/world_raids in BETA.';
  END IF;
END $guard$;

-- Registru de referinta: o singura inregistrare per raid, rezultat derivat in RPC.
-- credited_to_wallet=false: jucatorul primeste inca aur/XP prin vechiul flux de joc
-- din browser; registrul NU aplica resurse si nu reprezinta un sold.
CREATE TABLE IF NOT EXISTS public.beta_world_reward_reference (
  raid_id bigint PRIMARY KEY REFERENCES public.world_raids(id) ON DELETE CASCADE,
  attacker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attacker_level integer NOT NULL,
  defender_level integer NOT NULL,
  win_reported boolean NOT NULL,
  reference_gold integer NOT NULL CHECK (reference_gold >= 0),
  reference_xp integer NOT NULL CHECK (reference_xp >= 0),
  rules_version integer NOT NULL DEFAULT 1,
  credited_to_wallet boolean NOT NULL DEFAULT false,
  calculated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beta_world_reward_reference ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_world_reward_reference FROM PUBLIC, anon, authenticated;

-- Inlocuieste doar functia BETA instalata la SQL21.
-- PASTREAZA semnatura RPC folosita de browser si contracontorii raidurilor.
-- Formula: recompensele de baza PvP + bonusul obisnuit de victorie cu
-- valoarea mediana fixa 9 in loc de zar 6..12. Nu poate include bonusuri
-- teritoriale, buff-uri sau alte bonusuri imposibil de autentificat acum.
CREATE OR REPLACE FUNCTION public.world_raid_finish(
  p_id bigint, p_win boolean, p_gold int, p_xp int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $finish$
DECLARE
  v_uid uuid := auth.uid();
  v_r public.world_raids%ROWTYPE;
  v_att_level integer;
  v_def_level integer;
  v_level integer;
  v_factor numeric;
  v_gold integer := 0;
  v_xp integer := 0;
  v_win boolean := COALESCE(p_win,false);
BEGIN
  IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
    RAISE EXCEPTION 'Acces BETA neautorizat';
  END IF;

  SELECT * INTO v_r FROM public.world_raids
  WHERE id = p_id AND attacker = v_uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Atac necunoscut.'; END IF;

  -- Reincercarea unui rezultat este idempotenta: nu dubleaza statistici/registrul.
  IF v_r.finished_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok',true,'win',v_r.win,'gold',COALESCE(v_r.gold,0),
      'xp',COALESCE(v_r.xp,0),'already',true);
  END IF;

  -- Niveluri fixate la momentul startului de SQL22, nu la momentul finishului.
  SELECT attacker_level,defender_level
    INTO v_att_level,v_def_level
  FROM public.beta_world_combat_shadow
  WHERE raid_id = p_id;

  -- Compatibilitate: raid pornit inainte de instalarea SQL22.
  IF v_att_level IS NULL OR v_def_level IS NULL THEN
    SELECT level INTO v_att_level FROM public.world_players WHERE user_id=v_uid;
    SELECT level INTO v_def_level FROM public.world_players WHERE user_id=v_r.defender;
  END IF;

  v_att_level := GREATEST(1,LEAST(500,COALESCE(v_att_level,1)));
  v_def_level := GREATEST(1,LEAST(500,COALESCE(v_def_level,1)));
  v_level := LEAST(v_def_level,v_att_level+5);
  v_factor := GREATEST(0.3,LEAST(1.2,v_def_level::numeric/v_att_level));

  IF v_win THEN
    v_gold := GREATEST(0,ROUND(
      (60+30*v_level)*v_factor +
      (9+3*v_att_level)*2.55
    )::integer);
    v_xp := GREATEST(0,ROUND(
      (20+8*v_level)*v_factor*1.5 +
      (8+4*v_att_level)*2.55
    )::integer);
  END IF;

  -- SQL22 triggerul existent preia automat rezultatul acceptat.
  UPDATE public.world_raids
    SET finished_at=now(),win=v_win,gold=v_gold,xp=v_xp
  WHERE id=p_id;

  -- Auditul SQL21 pastreaza ce a cerut browserul si ce a acceptat serverul.
  INSERT INTO public.beta_world_result_audit(
    raid_id,reported_win,claimed_gold,claimed_xp,
    accepted_gold,accepted_xp,reported_at
  ) VALUES(
    p_id,v_win,p_gold,p_xp,v_gold,v_xp,now()
  ) ON CONFLICT(raid_id) DO NOTHING;

  -- Valori de referinta, NU transfer de bani sau XP in game_saves.
  INSERT INTO public.beta_world_reward_reference(
    raid_id,attacker_id,defender_id,attacker_level,defender_level,
    win_reported,reference_gold,reference_xp,rules_version,credited_to_wallet
  ) VALUES(
    p_id,v_uid,v_r.defender,v_att_level,v_def_level,
    v_win,v_gold,v_xp,1,false
  ) ON CONFLICT(raid_id) DO NOTHING;

  IF v_win THEN
    UPDATE public.world_players
      SET raids_won=raids_won+1 WHERE user_id=v_uid;
    UPDATE public.world_players
      SET def_lost=def_lost+1 WHERE user_id=v_r.defender;
  ELSE
    UPDATE public.world_players
      SET raids_lost=raids_lost+1 WHERE user_id=v_uid;
    UPDATE public.world_players
      SET def_won=def_won+1 WHERE user_id=v_r.defender;
  END IF;

  RETURN jsonb_build_object(
    'ok',true,'win',v_win,'gold',v_gold,'xp',v_xp,
    'reward_source','server_reference_not_wallet');
END
$finish$;

REVOKE ALL ON FUNCTION public.world_raid_finish(bigint,boolean,integer,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.world_raid_finish(bigint,boolean,integer,integer)
  TO authenticated;

COMMIT;

-- Diagnosticul este read-only, toate cele patru trebuie sa fie true.
SELECT
  to_regclass('public.beta_world_reward_reference') IS NOT NULL AS reward_table_exists,
  (SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_world_reward_reference')) AS reward_rls_enabled,
  COALESCE(
    position('server_reference_not_wallet' IN pg_get_functiondef(
      to_regprocedure('public.world_raid_finish(bigint,boolean,integer,integer)')
    ))>0,false
  ) AS reward_rpc_installed,
  EXISTS(
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.world_raids'::regclass
      AND tgname='beta_world_shadow_raid_finished' AND NOT tgisinternal
  ) AS sql22_finish_trigger_preserved;
