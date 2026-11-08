-- Silver Throne BETA · Pas 28: insemne cosmetice pentru bresle.
-- Doar Supabase Silver-Throne-Test. Rulare MANUALA dupa SQL14–19.
-- NU rula in LIVE; merge-ul GitHub nu executa migrari SQL.
-- Nicio schimbare de putere, loot, PvP, Tron sau boss. Platile sunt
-- din insemnele PERSONALE, exclusiv la actiunea unui lider/ofiter.
BEGIN;

ALTER TABLE public.guilds
 ADD COLUMN IF NOT EXISTS emblem text NOT NULL DEFAULT 'shield',
 ADD COLUMN IF NOT EXISTS banner text NOT NULL DEFAULT 'ash',
 ADD COLUMN IF NOT EXISTS frame text NOT NULL DEFAULT 'bronze';

CREATE TABLE IF NOT EXISTS public.guild_cosmetic_unlocks(
 guild_id bigint NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN('emblem','banner','frame')),
 variant text NOT NULL,
 unlocked_at timestamptz NOT NULL DEFAULT now(),
 unlocked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 PRIMARY KEY(guild_id,kind,variant)
);
ALTER TABLE public.guild_cosmetic_unlocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.guild_cosmetic_unlocks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guild_cosmetic_catalog()
RETURNS TABLE(kind text,variant text,label text,cost integer)
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $catalog$
 SELECT c.kind,c.variant,c.label,c.cost
 FROM (VALUES
  ('emblem'::text,'shield'::text,'Scutul breslei'::text,0),
  ('emblem','sun','Soarele de Argint',15),
  ('emblem','wolf','Lupul de Fier',25),
  ('emblem','crown','Coroana',40),
  ('banner','ash','Cenușiu',0),
  ('banner','forest','Verde de Codru',15),
  ('banner','royal','Purpură Regală',30),
  ('frame','bronze','Ramă de Bronz',0),
  ('frame','silver','Ramă de Argint',15),
  ('frame','gold','Ramă de Aur',40)
 ) AS c(kind,variant,label,cost);
$catalog$;
REVOKE ALL ON FUNCTION public.guild_cosmetic_catalog() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guild_cosmetics_api(
 p_action text DEFAULT 'status',p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $cosmetics$
DECLARE
 v_uid uuid := auth.uid();
 v_action text := lower(trim(coalesce(p_action,'status')));
 v_me public.guild_members%ROWTYPE;
 v_g public.guilds%ROWTYPE;
 v_kind text;v_variant text;v_price integer;
 v_catalog jsonb;
BEGIN
 IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
  RAISE EXCEPTION 'Cosmeticele sunt disponibile doar conturilor autorizate BETA.';
 END IF;
 IF v_action NOT IN ('status','buy','equip') THEN
  RAISE EXCEPTION 'Actiune cosmetica necunoscuta.';
 END IF;
 p_data:=coalesce(p_data,'{}'::jsonb);
 SELECT * INTO v_me FROM public.guild_members WHERE user_id=v_uid FOR UPDATE;
 IF v_me.user_id IS NULL THEN
  IF v_action<>'status' THEN RAISE EXCEPTION 'Nu esti intr-o breasla.'; END IF;
  RETURN jsonb_build_object('guild_id',null,'catalog','[]'::jsonb);
 END IF;
 SELECT * INTO v_g FROM public.guilds WHERE id=v_me.guild_id FOR UPDATE;
 IF v_g.id IS NULL THEN RAISE EXCEPTION 'Breasla nu mai exista.'; END IF;
 IF v_action IN ('buy','equip') THEN
  IF v_me.role NOT IN ('leader','officer') THEN
   RAISE EXCEPTION 'Numai conducatorul si ofiterii pot schimba cosmeticele breslei.';
  END IF;
  v_kind:=coalesce(p_data->>'kind','');
  v_variant:=coalesce(p_data->>'variant','');
  SELECT c.cost INTO v_price FROM public.guild_cosmetic_catalog() c
   WHERE c.kind=v_kind AND c.variant=v_variant;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aspect cosmetic necunoscut.'; END IF;
  IF v_action='buy' THEN
   IF v_price=0 OR EXISTS(
    SELECT 1 FROM public.guild_cosmetic_unlocks u
     WHERE u.guild_id=v_g.id AND u.kind=v_kind AND u.variant=v_variant) THEN
    RAISE EXCEPTION 'Aspect deja disponibil; selecteaza Foloseste.';
   END IF;
   UPDATE public.guild_members SET marks=marks-v_price
   WHERE user_id=v_uid AND guild_id=v_g.id AND marks>=v_price
   RETURNING * INTO v_me;
   IF NOT FOUND THEN RAISE EXCEPTION 'Nu ai suficiente insemne.'; END IF;
   INSERT INTO public.guild_cosmetic_unlocks(guild_id,kind,variant,unlocked_by)
     VALUES(v_g.id,v_kind,v_variant,v_uid);
  ELSIF v_price>0 AND NOT EXISTS(
    SELECT 1 FROM public.guild_cosmetic_unlocks u
     WHERE u.guild_id=v_g.id AND u.kind=v_kind AND u.variant=v_variant) THEN
   RAISE EXCEPTION 'Deblocheaza aspectul inainte sa il folosesti.';
  END IF;
  /* Cumpararea aplica automat aspectul, fara al doilea click.
     Serverul valideaza lista, apartenenta, rolul si plata. */
  UPDATE public.guilds SET
   emblem=CASE WHEN v_kind='emblem' THEN v_variant ELSE emblem END,
   banner=CASE WHEN v_kind='banner' THEN v_variant ELSE banner END,
   frame=CASE WHEN v_kind='frame' THEN v_variant ELSE frame END
  WHERE id=v_g.id;
  SELECT * INTO v_g FROM public.guilds WHERE id=v_g.id;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'kind',c.kind,'variant',c.variant,'label',c.label,'cost',c.cost,
  'owned',c.cost=0 OR EXISTS(
     SELECT 1 FROM public.guild_cosmetic_unlocks u
     WHERE u.guild_id=v_g.id AND u.kind=c.kind AND u.variant=c.variant)
 ) ORDER BY c.kind,c.cost,c.variant),'[]'::jsonb)
 INTO v_catalog FROM public.guild_cosmetic_catalog() c;
 RETURN jsonb_build_object(
  'guild_id',v_g.id,'role',v_me.role,'balance',v_me.marks,
  'can_manage',v_me.role IN ('leader','officer'),
  'selected',jsonb_build_object('emblem',v_g.emblem,
     'banner',v_g.banner,'frame',v_g.frame),
  'catalog',v_catalog);
END $cosmetics$;
REVOKE ALL ON FUNCTION public.guild_cosmetics_api(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guild_cosmetics_api(text,jsonb) TO authenticated;
COMMIT;
