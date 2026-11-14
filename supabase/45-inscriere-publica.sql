-- Silver Throne · SQL45 · Înscriere publică.
-- Rulați în Supabase Silver-Throne-Test (proiectul jocului). NU în proiectul LIVE vechi.
-- Ce face:
--   • public.st_can_play(): orice cont autentificat care nu e blocat în public.st_bans.
--   • Funcțiile jucătorului (Lume, poștă, prieteni, bresle, chat, Tron, Rune, activități) nu mai cer
--     public.is_beta_admin(), ci public.st_can_play(). Restul codului fiecărei funcții rămâne identic:
--     definiția existentă e citită din baza de date și doar poarta de acces e înlocuită.
--   • Rămân DOAR pentru administratori: rune_admin, beta_world_raid_test_mode,
--     beta_throne_reset_protection și steagul 'admin' din rune_json.
--   • Politicile game_saves: fiecare cont își citește/scrie doar propria salvare, fără poarta de admin.
-- Nu șterge conturi, salvări, bresle sau progres. Se poate rula de mai multe ori.
-- După rulare: Authentication → Sign In / Providers → „Allow new users to sign up” = ON, cu confirmarea emailului ON.
BEGIN;

CREATE TABLE IF NOT EXISTS public.st_bans (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.st_bans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.st_bans FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.st_can_play()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT (SELECT auth.uid()) IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.st_bans b WHERE b.user_id = (SELECT auth.uid()))
$function$;
REVOKE ALL ON FUNCTION public.st_can_play() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.st_can_play() TO authenticated;

/* Rescrie poarta din funcțiile jucătorului. Lipsa unei funcții (SQL nerulat) nu oprește migrarea. */
DO $migrate$
DECLARE
  f text; d text; n int := 0;
  player_fns text[] := ARRAY[
    'world_npc_get()', 'world_npc_raid(integer,integer)', 'world_join(jsonb)',
    'world_raid_start(uuid)', 'world_raid_finish(bigint,boolean,integer,integer)',
    'world_mail_send(uuid,text)', 'world_mail_inbox()', 'world_mail_read(bigint)',
    'world_friends_list()', 'world_friends_request(uuid)', 'world_friends_respond(bigint,boolean)', 'world_friends_remove(bigint)',
    'guild_api(text,jsonb)', 'guild_social_api(text,jsonb)', 'guild_map_tags()', 'guild_cosmetics_api(text,jsonb)', 'guild_chat_api(text,jsonb)',
    'beta_world_combat_my_report(bigint)', 'beta_economy_status()', 'beta_economy_capture_world_raid_start()',
    'beta_economy_capture_guild_boss_hit()', 'beta_verified_activity_status()',
    'beta_throne_challenge_finish_audited(bigint,boolean)', 'throne_publish(text,integer,jsonb)',
    'rune_state()', 'rune_buy(text,integer)'];
BEGIN
  FOREACH f IN ARRAY player_fns LOOP
    IF to_regprocedure('public.' || f) IS NULL THEN RAISE NOTICE 'SQL45: lipsește public.%', f; CONTINUE; END IF;
    d := pg_get_functiondef(to_regprocedure('public.' || f));
    IF position('is_beta_admin()' IN d) = 0 THEN CONTINUE; END IF;
    d := replace(d, 'public.is_beta_admin()', 'public.st_can_play()');
    d := replace(d, 'Acces BETA neautorizat', 'Acces refuzat: contul nu poate juca');
    EXECUTE d;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'SQL45: % funcții deschise pentru jucători', n;
END
$migrate$;

/* salvările: doar propriul rând, pentru orice jucător */
DROP POLICY IF EXISTS game_saves_select ON public.game_saves;
DROP POLICY IF EXISTS game_saves_insert ON public.game_saves;
DROP POLICY IF EXISTS game_saves_update ON public.game_saves;
CREATE POLICY game_saves_select ON public.game_saves FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id AND public.st_can_play());
CREATE POLICY game_saves_insert ON public.game_saves FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.st_can_play());
CREATE POLICY game_saves_update ON public.game_saves FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND public.st_can_play())
  WITH CHECK ((SELECT auth.uid()) = user_id AND public.st_can_play());
REVOKE ALL ON TABLE public.game_saves FROM anon;
COMMIT;

-- Verificare (doar citire): sunt așteptate exact 4 funcții care mai cer administrator.
SELECT
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
    WHERE s.nspname = 'public' AND p.proname <> 'is_beta_admin' AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) LIKE '%is_beta_admin()%') AS functii_doar_admin,
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
    WHERE s.nspname = 'public' AND p.prokind = 'f' AND pg_get_functiondef(p.oid) LIKE '%st_can_play()%') AS functii_jucatori,
  (SELECT count(*) FROM pg_policies WHERE tablename = 'game_saves' AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%st_can_play%') AS politici_salvari;
