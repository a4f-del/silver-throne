-- Silver Throne BETA: salvări și roluri (fara progresul utilizatorilor LIVE).
-- PRECONDITIE: supabase/07-beta-access.sql din PR #11 a fost rulat pe BETA.
BEGIN;
CREATE TABLE IF NOT EXISTS public.game_saves(
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  game_data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS game_saves_select ON public.game_saves;
DROP POLICY IF EXISTS game_saves_insert ON public.game_saves;
DROP POLICY IF EXISTS game_saves_update ON public.game_saves;
CREATE POLICY game_saves_select ON public.game_saves FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id AND public.is_beta_admin());
CREATE POLICY game_saves_insert ON public.game_saves FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND public.is_beta_admin());
CREATE POLICY game_saves_update ON public.game_saves FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id AND public.is_beta_admin())
  WITH CHECK ((select auth.uid()) = user_id AND public.is_beta_admin());
GRANT SELECT, INSERT, UPDATE ON public.game_saves TO authenticated;

CREATE TABLE IF NOT EXISTS public.admins(
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admins FROM PUBLIC, anon, authenticated;
-- Pe BETA, administratorii invitati sunt si administratori de joc.
INSERT INTO public.admins(user_id)
SELECT user_id FROM public.beta_admins
ON CONFLICT(user_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.admins a WHERE a.user_id = (select auth.uid()))
$fn$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
COMMIT;
