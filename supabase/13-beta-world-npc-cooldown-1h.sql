-- Silver Throne: BETA ONLY — scade cooldownul satelor NPC comune de la 4h la 1h.
-- Rulati o singura data in Supabase -> Silver-Throne-Test -> SQL Editor.
-- NU rulati in LIVE. Nu modificati tabela sau salvarea; cooldownurile deja pornite
-- isi pastreaza timestampul pana la expirare (maximum 4h la momentul migrarii).
BEGIN;

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

REVOKE ALL ON FUNCTION public.world_npc_raid(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.world_npc_raid(integer, integer) TO authenticated;

COMMIT;
