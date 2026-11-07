-- Silver Throne - buton admin BETA pentru anularea protectiei regelui.
-- RULATI DOAR in Silver-Throne-Test (NU LIVE).
-- Doar membrii public.beta_admins pot apela functia; verificarea este server-side.
BEGIN;

CREATE OR REPLACE FUNCTION public.beta_throne_reset_protection()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now timestamptz;
  v_holder uuid;
  v_changed boolean := false;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_beta_admin() THEN
    RAISE EXCEPTION 'Acces interzis: doar administratorii BETA pot reseta protectia.';
  END IF;

  -- Refacem starea saptamanii, in caz ca protectia a ramas din saptamana trecuta.
  PERFORM public.throne_rollover();
  v_now := public.throne_now();

  UPDATE public.throne_state
     SET protect_until = v_now
   WHERE id = 1
     AND holder IS NOT NULL
     AND protect_until > v_now
  RETURNING holder INTO v_holder;

  v_changed := FOUND;
  RETURN jsonb_build_object('ok', true, 'changed', v_changed,
                            'holder', v_holder);
END;
$function$;

REVOKE ALL ON FUNCTION public.beta_throne_reset_protection()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.beta_throne_reset_protection()
  TO authenticated;
COMMIT;

-- Verificare doar-citire:
-- SELECT to_regprocedure('public.beta_throne_reset_protection()') IS NOT NULL
--   AS reset_protectie_beta_instalat;
