-- Silver Throne BETA: siglele publice de breasla in meniurile satelor.
-- Ruleaza DOAR in Supabase Silver-Throne-Test, dupa migrarile 14 si 15.
-- Fara modificari de tabele, roluri, salvare sau date existente.
BEGIN;

CREATE OR REPLACE FUNCTION public.guild_map_tags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE v_uid uuid := auth.uid(); v_tags jsonb;
BEGIN
 IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
   RAISE EXCEPTION 'Acces permis doar conturilor din BETA.';
 END IF;
 -- Siglele sunt publice in joc, dar expunem doar membrii ce au profil
 -- deja publicat in Lume: UUID -> prescurtare (nu email, rang, invitatii).
 SELECT coalesce(jsonb_object_agg(m.user_id::text,g.tag),'{}'::jsonb)
 INTO v_tags
 FROM public.guild_members m
 JOIN public.guilds g ON g.id=m.guild_id
 JOIN public.world_players w ON w.user_id=m.user_id;
 RETURN v_tags;
END;
$fn$;
REVOKE ALL ON FUNCTION public.guild_map_tags() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guild_map_tags() TO authenticated;
COMMIT;
