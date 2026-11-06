-- Silver Throne — ruleaza DOAR in proiectul Supabase BETA.
-- Mai intai invita administratorii prin Authentication > Users.
-- Nu introduce aici parole sau chei service_role.
BEGIN;
CREATE TABLE IF NOT EXISTS public.beta_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beta_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_admins FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_beta_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.beta_admins b
    WHERE b.user_id = (SELECT auth.uid())
  )
$function$;
REVOKE ALL ON FUNCTION public.is_beta_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_beta_admin() TO authenticated;
COMMIT;

-- Adauga manual numai utilizatorii invitati ca administratori (inlocuieste
-- emailul EXEMPLU cu emailul admin din proiectul BETA):
-- INSERT INTO public.beta_admins(user_id)
-- SELECT id FROM auth.users WHERE email = 'admin@example.com'
-- ON CONFLICT (user_id) DO NOTHING;

-- Verificare (se ruleaza in SQL Editor cu acces de administrator):
-- SELECT u.email, b.user_id FROM public.beta_admins b
-- JOIN auth.users u ON u.id = b.user_id;
