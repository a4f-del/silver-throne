-- Silver Throne · PRE-FLIGHT LIVE · doar diagnostic, fara modificari.
-- Poate fi rulat atat pe LIVE cat si pe BETA in Supabase SQL Editor.
-- NU executa migrari. NU sterge utilizatori, salvari sau progres.
-- Rezultatul arata ce obiecte exista, NU dovedeste siguranta lansarii.

SELECT 'core.game_saves' AS control,
       to_regclass('public.game_saves') IS NOT NULL AS installed
UNION ALL SELECT 'core.save_user_id',
 EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='game_saves' AND column_name='user_id')
UNION ALL SELECT 'core.save_game_data',
 EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='game_saves' AND column_name='game_data')
UNION ALL SELECT 'world.world_players',
 to_regclass('public.world_players') IS NOT NULL
UNION ALL SELECT 'world.world_raids',
 to_regclass('public.world_raids') IS NOT NULL
UNION ALL SELECT 'world.world_join_rpc',
 to_regprocedure('public.world_join(jsonb)') IS NOT NULL
UNION ALL SELECT 'world.raid_start_rpc',
 to_regprocedure('public.world_raid_start(uuid)') IS NOT NULL
UNION ALL SELECT 'world.raid_finish_rpc',
 to_regprocedure('public.world_raid_finish(bigint,boolean,integer,integer)') IS NOT NULL
UNION ALL SELECT 'throne.throne_profiles',
 to_regclass('public.throne_profiles') IS NOT NULL
UNION ALL SELECT 'throne.throne_challenges',
 to_regclass('public.throne_challenges') IS NOT NULL
UNION ALL SELECT 'throne.duel_version_column',
 EXISTS(SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='throne_profiles' AND column_name='duel_version')
UNION ALL SELECT 'throne.publish_rpc',
 to_regprocedure('public.throne_publish(text,integer,jsonb)') IS NOT NULL
UNION ALL SELECT 'throne.challenge_start_rpc',
 to_regprocedure('public.throne_challenge_start()') IS NOT NULL
UNION ALL SELECT 'throne.challenge_finish_rpc',
 to_regprocedure('public.throne_challenge_finish(bigint,boolean)') IS NOT NULL
UNION ALL SELECT 'guild.guilds_table',
 to_regclass('public.guilds') IS NOT NULL
UNION ALL SELECT 'guild.guild_members_table',
 to_regclass('public.guild_members') IS NOT NULL
UNION ALL SELECT 'guild.guild_weeks_table',
 to_regclass('public.guild_weeks') IS NOT NULL
UNION ALL SELECT 'guild.api_rpc',
 to_regprocedure('public.guild_api(text,jsonb)') IS NOT NULL
UNION ALL SELECT 'guild.formation_marker',
 COALESCE(position('formation_rules' IN
   pg_get_functiondef(to_regprocedure('public.guild_api(text,jsonb)')))>0,false)
UNION ALL SELECT 'guild.cosmetic_rpc',
 to_regprocedure('public.guild_cosmetics_api(text,jsonb)') IS NOT NULL
UNION ALL SELECT 'social.world_mail_table',
 to_regclass('public.world_mail') IS NOT NULL
UNION ALL SELECT 'social.world_friends_table',
 to_regclass('public.world_friends') IS NOT NULL
UNION ALL SELECT 'beta.beta_admins_table',
 to_regclass('public.beta_admins') IS NOT NULL
UNION ALL SELECT 'beta.is_beta_admin_rpc',
 to_regprocedure('public.is_beta_admin()') IS NOT NULL
UNION ALL SELECT 'beta.audit_sql21_publish',
 to_regclass('public.beta_world_publish_audit') IS NOT NULL
UNION ALL SELECT 'beta.audit_sql21_results',
 to_regclass('public.beta_world_result_audit') IS NOT NULL
UNION ALL SELECT 'beta.audit_sql22_shadow',
 to_regclass('public.beta_world_combat_shadow') IS NOT NULL
UNION ALL SELECT 'beta.audit_sql23_save',
 to_regclass('public.beta_save_progress_audit') IS NOT NULL
ORDER BY control;

-- Aceste rezultate indica NUMAI daca RLS este activ pe tabelele-cheie;
-- un rezultat true nu garanteaza politici si permisiuni corecte.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS force_rls
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN (
    'game_saves','world_players','world_raids','guilds','guild_members',
    'guild_weeks','throne_profiles','beta_world_combat_shadow',
    'beta_save_progress_audit'
  )
ORDER BY c.relname;
