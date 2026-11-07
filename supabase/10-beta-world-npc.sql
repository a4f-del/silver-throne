-- Silver Throne BETA: cooldown persistent pentru jefuirea satelor libere (NPC).
-- Aplicati EXCLUSIV in Supabase -> Silver-Throne-Test -> SQL Editor.
-- NU aplicati pe LIVE. Nu reinstaleaza jocul si nu sterge progresul.
BEGIN;

CREATE TABLE IF NOT EXISTS public.world_npc_raids (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  npc_id text NOT NULL CHECK (npc_id ~ '^wn-?[0-9]+_-?[0-9]+$'),
  cooldown_until timestamptz NOT NULL,
  PRIMARY KEY (user_id, npc_id)
);

CREATE INDEX IF NOT EXISTS world_npc_raids_until_idx
  ON public.world_npc_raids (cooldown_until);

ALTER TABLE public.world_npc_raids ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.world_npc_raids FROM PUBLIC, anon, authenticated;

-- Formatul clientului: { "cd": { "wn1_2": 1794052800000 } }
CREATE OR REPLACE FUNCTION public.world_npc_get()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_cd jsonb;
BEGIN
  IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
    RAISE EXCEPTION 'Acces BETA neautorizat';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(npc_id, (extract(epoch from cooldown_until) * 1000)::bigint),
    '{}'::jsonb
  )
  INTO v_cd
  FROM public.world_npc_raids
  WHERE user_id = v_uid AND cooldown_until > clock_timestamp();

  RETURN jsonb_build_object('cd', v_cd);
END
$function$;

-- Formatul clientului: p_x, p_y -> { "until": 1794052800000 }
-- ON CONFLICT + WHERE impiedica raidurile concurente in timpul cooldownului.
CREATE OR REPLACE FUNCTION public.world_npc_raid(p_x integer, p_y integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_id text;
  v_now timestamptz := clock_timestamp();
  v_until timestamptz;
BEGIN
  IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
    RAISE EXCEPTION 'Acces BETA neautorizat';
  END IF;

  IF p_x IS NULL OR p_y IS NULL OR abs(p_x) > 128 OR abs(p_y) > 128 THEN
    RAISE EXCEPTION 'Coordonate NPC invalide';
  END IF;

  v_id := 'wn' || p_x::text || '_' || p_y::text;
  INSERT INTO public.world_npc_raids(user_id, npc_id, cooldown_until)
  VALUES (v_uid, v_id, v_now + interval '1 hour')
  ON CONFLICT (user_id, npc_id) DO UPDATE
    SET cooldown_until = excluded.cooldown_until
    WHERE public.world_npc_raids.cooldown_until <= v_now
  RETURNING cooldown_until INTO v_until;

  IF v_until IS NULL THEN
    RAISE EXCEPTION 'Satul a fost jefuit recent. Revino după expirarea cooldownului.';
  END IF;

  RETURN jsonb_build_object('until', (extract(epoch from v_until) * 1000)::bigint);
END
$function$;

REVOKE ALL ON FUNCTION public.world_npc_get() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.world_npc_raid(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.world_npc_get() TO authenticated;
GRANT EXECUTE ON FUNCTION public.world_npc_raid(integer, integer) TO authenticated;

COMMIT;

-- Verificare neinvaziva (doar CITIRE):
-- SELECT
--   to_regprocedure('public.world_npc_get()') IS NOT NULL AS npc_get_ok,
--   to_regprocedure('public.world_npc_raid(integer, integer)') IS NOT NULL AS npc_raid_ok;
