-- Silver Throne BETA / SQL34 / pasul 33
-- Jurnal server-side pentru incercarile reale la bossul de breasla.
-- EXCLUSIV Supabase Silver-Throne-Test, MANUAL, DUPA SQL14-19 si SQL25-26.
-- FARA LIVE. Nu rescrie guild_api, nu plateste aur/XP, nu atinge salvarea.
-- Verifica faptul ca serverul a acceptat o incercare; NU atesta
-- autenticitatea statisticilor echipei publicate initial de browser.
-- Nu importa retroactiv hiturile vechi.
BEGIN;

DO $preflight$
BEGIN
 IF to_regclass('public.guild_boss_hits') IS NULL
    OR to_regclass('public.guild_members') IS NULL
    OR to_regclass('public.beta_economy_accounts') IS NULL
    OR to_regclass('public.beta_economy_ledger') IS NULL
    OR to_regprocedure('public.guild_api(text,jsonb)') IS NULL
    OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
   RAISE EXCEPTION 'SQL34 necesita Bresle (SQL14-19) si registrul SQL25-26 in Silver-Throne-Test.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_accounts'
     AND column_name='verified_raid_uses'
 ) OR NOT EXISTS (
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_ledger'
     AND column_name='verified_raid_uses_delta'
 ) OR NOT EXISTS (
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_raids'::regclass
     AND tgname='beta_economy_world_raid_started'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) THEN
   RAISE EXCEPTION 'SQL34 necesita SQL26 activ; nu suprascriem instalarea partiala.';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class
   WHERE oid='public.guild_boss_hits'::regclass AND relrowsecurity
 ) OR has_table_privilege('authenticated','public.guild_boss_hits','INSERT')
    OR has_table_privilege('anon','public.guild_boss_hits','INSERT') THEN
   RAISE EXCEPTION 'SQL34 refuza instalarea: guild_boss_hits trebuie sa fie privata si cu RLS activ.';
 END IF;
 IF EXISTS (
   SELECT 1 FROM (VALUES
     ('guild_boss_hits','id'),('guild_boss_hits','user_id'),
     ('guild_boss_hits','guild_id'),('guild_boss_hits','week_start'),
     ('guild_boss_hits','local_day'),('guild_boss_hits','damage'),
     ('guild_members','guild_id'),('guild_members','user_id')
   ) AS required(table_name,column_name)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=required.table_name
       AND column_name=required.column_name
   )
 ) THEN
   RAISE EXCEPTION 'SQL34: structura Breslelor difera de schema asteptata.';
 END IF;
END
$preflight$;

-- Contor informational din registrul SHADOW; zero bani, zero XP.
ALTER TABLE public.beta_economy_accounts
 ADD COLUMN IF NOT EXISTS verified_guild_boss_hits bigint NOT NULL DEFAULT 0
 CHECK (verified_guild_boss_hits >= 0);

ALTER TABLE public.beta_economy_ledger
 ADD COLUMN IF NOT EXISTS verified_guild_boss_hit_delta integer NOT NULL DEFAULT 0
 CHECK (verified_guild_boss_hit_delta IN (0,1));

-- Adauga exact sursa noua, pastrand toate sursele deja acceptate de SQL26.
ALTER TABLE public.beta_economy_ledger
 DROP CONSTRAINT IF EXISTS beta_economy_ledger_source_check;
ALTER TABLE public.beta_economy_ledger
 ADD CONSTRAINT beta_economy_ledger_source_check CHECK (
   source IN (
     'migration','admin_adjustment','dungeon_verified','pvp_verified',
     'forge_verified','market_verified','throne_verified',
     'raid_energy_verified','guild_boss_hit_verified'
   )
 );

-- Triggerul vede DOAR randul creat de guild_api('boss').
-- guild_api deja controleaza apartenenta, 2 hituri/zi si calculeaza dauna
-- folosind profilul de Lume publicat. Nu acceptam event_id sau damage
-- dintr-o cerere separata a browserului.
CREATE OR REPLACE FUNCTION public.beta_economy_capture_guild_boss_hit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $capture$
DECLARE
 v_uid uuid := auth.uid();
 v_account public.beta_economy_accounts%ROWTYPE;
 v_key text;
 v_revision bigint;
BEGIN
 IF v_uid IS NULL OR NEW.user_id IS DISTINCT FROM v_uid
    OR NOT public.is_beta_admin() THEN
   RAISE EXCEPTION 'Hit de breasla neautorizat in registrul BETA.';
 END IF;
 IF NEW.id IS NULL OR NEW.guild_id IS NULL
    OR NEW.damage IS NULL OR NEW.damage<=0
    OR NEW.week_start IS DISTINCT FROM
       date_trunc('week',now() AT TIME ZONE 'Europe/Bucharest')::date
    OR NEW.local_day IS DISTINCT FROM
       (now() AT TIME ZONE 'Europe/Bucharest')::date
    OR NOT EXISTS (
      SELECT 1 FROM public.guild_members m
      WHERE m.user_id=NEW.user_id AND m.guild_id=NEW.guild_id
    ) THEN
   RAISE EXCEPTION 'Hit de breasla fara provenienta valida.';
 END IF;

 v_key := 'guild-boss-hit:' || NEW.id::text;
 INSERT INTO public.beta_economy_accounts(user_id)
 VALUES (NEW.user_id) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO STRICT v_account
 FROM public.beta_economy_accounts
 WHERE user_id=NEW.user_id FOR UPDATE;

 -- Aceeasi cheie nu poate contoriza de doua ori, inclusiv la retry.
 IF EXISTS(
   SELECT 1 FROM public.beta_economy_ledger
   WHERE user_id=NEW.user_id AND event_key=v_key
 ) THEN RETURN NEW; END IF;

 v_revision:=v_account.revision+1;
 UPDATE public.beta_economy_accounts SET
   verified_guild_boss_hits=verified_guild_boss_hits+1,
   revision=v_revision,updated_at=now()
 WHERE user_id=NEW.user_id;

 INSERT INTO public.beta_economy_ledger(
   user_id,event_key,source,gold_delta,ore_delta,xp_delta,
   verified_raid_uses_delta,verified_guild_boss_hit_delta,
   gold_after,ore_after,xp_after,revision
 ) VALUES(
   NEW.user_id,v_key,'guild_boss_hit_verified',0,0,0,
   0,1,v_account.gold,v_account.ore,v_account.xp,v_revision
 );
 RETURN NEW;
END
$capture$;

DROP TRIGGER IF EXISTS beta_economy_guild_boss_hit_created
 ON public.guild_boss_hits;
CREATE TRIGGER beta_economy_guild_boss_hit_created
AFTER INSERT ON public.guild_boss_hits
FOR EACH ROW EXECUTE FUNCTION public.beta_economy_capture_guild_boss_hit();

REVOKE ALL ON FUNCTION public.beta_economy_capture_guild_boss_hit()
 FROM PUBLIC,anon,authenticated;

COMMIT;

-- Doar verificari de schema; NU este un test de hit autentic.
-- Toate valorile asteptate: true.
SELECT
 to_regclass('public.beta_economy_accounts') IS NOT NULL
   AND EXISTS(
     SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='beta_economy_accounts'
       AND column_name='verified_guild_boss_hits'
   ) AS hit_counter_exists,
 EXISTS(
   SELECT 1 FROM information_schema.columns
   WHERE table_schema='public' AND table_name='beta_economy_ledger'
     AND column_name='verified_guild_boss_hit_delta'
 ) AS hit_delta_exists,
 EXISTS(
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.guild_boss_hits'::regclass
     AND tgname='beta_economy_guild_boss_hit_created'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) AS boss_trigger_active,
 EXISTS(
   SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.world_raids'::regclass
     AND tgname='beta_economy_world_raid_started'
     AND NOT tgisinternal AND tgenabled<>'D'
 ) AS sql26_trigger_preserved,
 NOT has_function_privilege('authenticated',
   'public.beta_economy_capture_guild_boss_hit()','EXECUTE')
   AS trigger_not_callable_by_players,
 NOT has_function_privilege('anon',
   'public.beta_economy_capture_guild_boss_hit()','EXECUTE')
   AS trigger_not_callable_by_anon,
 NOT has_table_privilege('authenticated','public.guild_boss_hits','INSERT')
   AND NOT has_table_privilege('anon','public.guild_boss_hits','INSERT')
   AS direct_hits_denied,
 to_regprocedure('public.guild_api(text,jsonb)') IS NOT NULL
   AS guild_api_preserved,
 EXISTS(
   SELECT 1 FROM pg_constraint
   WHERE conrelid='public.beta_economy_ledger'::regclass
     AND conname='beta_economy_ledger_source_check'
     AND pg_get_constraintdef(oid) LIKE '%guild_boss_hit_verified%'
     AND pg_get_constraintdef(oid) LIKE '%raid_energy_verified%'
 ) AS ledger_sources_preserved;
