-- Silver Throne · REPARATIE BETA (dupa SQL 19 si 20 rulate inainte de SQL 17)
-- Exclusiv Supabase Silver-Throne-Test. NU rulati in LIVE.
-- Scop: remediaza «record "v_w" has no field "active_at_start"».
-- Script idempotent: nu sterge date, nu reseteaza progresul/contractele,
-- nu redefineste guild_api (deci pastreaza rolurile bossului din SQL 19)
-- si nu atinge atelierul de cosmetice din SQL 20.
-- Presupune schema de baza SQL 14–16 deja instalata.
-- SQL 17 definea coloanele si aceasta functie; aici instalam numai
-- componentele lipsa, fara sa suprascriem o versiune mai noua guild_api.
BEGIN;
ALTER TABLE public.guild_weeks
  ADD COLUMN IF NOT EXISTS active_at_start integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS goal_dungeons integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS goal_hard_boss integer NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS goal_tower integer NOT NULL DEFAULT 1000;

CREATE OR REPLACE FUNCTION public.guild_week_ensure(p_gid bigint)
RETURNS date LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v_week date := date_trunc('week', now() AT TIME ZONE 'Europe/Bucharest')::date;
 v_members integer; v_active integer; v_new bigint; v_old record;
BEGIN
 PERFORM 1 FROM public.guilds WHERE id=p_gid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Breasla nu exista.'; END IF;
 SELECT count(*) INTO v_members FROM public.guild_members m
 LEFT JOIN public.world_players w ON w.user_id=m.user_id
 WHERE m.guild_id=p_gid AND (w.seen_at>=now()-interval '7 days'
   OR m.joined_at>=now()-interval '7 days');
 /* Snapshot la inceputul saptamanii: contributii in saptamana precedenta
   ori intrare in breasla in acea saptamana. Fara dependenta de seen_at curent. */
 SELECT count(*) INTO v_active FROM public.guild_members m
 WHERE m.guild_id=p_gid
   AND m.joined_at < (v_week::timestamp AT TIME ZONE 'Europe/Bucharest')
   AND (m.joined_at >= ((v_week-7)::timestamp AT TIME ZONE 'Europe/Bucharest')
     OR EXISTS(SELECT 1 FROM public.guild_participation p
       WHERE p.guild_id=p_gid AND p.user_id=m.user_id AND p.week_start=v_week-7
         AND p.dungeons+p.hard_boss+p.tower+p.boss_hits>0));
 v_active := greatest(1,least(20,v_active));
 v_new := 24000 + 12000 * greatest(1,v_members);
 INSERT INTO public.guild_weeks(
   guild_id,week_start,boss_max,boss_hp,active_at_start,
   goal_dungeons,goal_hard_boss,goal_tower)
 VALUES(p_gid,v_week,v_new,v_new,v_active,
   least(150,12*v_active),least(25,2*v_active),least(1000,60*v_active))
 ON CONFLICT (guild_id,week_start) DO NOTHING;
 SELECT boss_max,boss_hp INTO v_old FROM public.guild_weeks
 WHERE guild_id=p_gid AND week_start=v_week FOR UPDATE;
 IF v_old.boss_max <> v_new AND v_old.boss_hp>0 THEN
  UPDATE public.guild_weeks SET boss_max=v_new,
    boss_hp=least(v_new,greatest(1,v_old.boss_hp+v_new-v_old.boss_max))
  WHERE guild_id=p_gid AND week_start=v_week;
 END IF;
 RETURN v_week;
END $fn$;
REVOKE ALL ON FUNCTION public.guild_week_ensure(bigint) FROM PUBLIC, anon, authenticated;
COMMIT;

-- Diagnosticul de dupa COMMIT este read-only. Toate cele patru coloane
-- trebuie sa apara; guild_api ar trebui sa fie deja cel din SQL 19.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='guild_weeks'
  AND column_name IN ('active_at_start','goal_dungeons','goal_hard_boss','goal_tower')
ORDER BY column_name;

SELECT
  to_regprocedure('public.guild_api(text,jsonb)') IS NOT NULL AS guild_api_exists,
  coalesce(position('formation_rules' IN
    pg_get_functiondef(to_regprocedure('public.guild_api(text,jsonb)')))>0,false)
    AS step_27_guild_api_present;

-- Atentie: daca raportul spune false pentru step_27_guild_api_present,
-- versiunea SQL 19 a functiei trebuie verificata separat, nu rescrisa
-- automat in cadrul reparatiei.
