-- Silver Throne · SQL 26 · Pasul 33 / BETA
-- Prima actiune reala in registru: atac PvP PORNIT si energie consumata pe server.
-- RULEAZA DOAR in Supabase Silver-Throne-Test DUPA SQL21-25. NU LIVE!
-- Nu crediteaza aur/XP, nu modifica rezultatul bataliei, nu sterge progres.
-- Acest eveniment verifica NUMAI inceputul raidului, nu victoria sau itemele.

BEGIN;

DO $prereq$
BEGIN
  IF to_regclass('public.world_raids') IS NULL
     OR to_regclass('public.world_players') IS NULL
     OR to_regclass('public.beta_economy_accounts') IS NULL
     OR to_regclass('public.beta_economy_ledger') IS NULL
     OR to_regclass('public.beta_world_combat_shadow') IS NULL
     OR to_regprocedure('public.world_raid_start(uuid)') IS NULL
     OR to_regprocedure('public.is_beta_admin()') IS NULL THEN
    RAISE EXCEPTION 'SQL26 necesita Lumea si SQL22+SQL25 in proiectul BETA.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid='public.world_raids'::regclass AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'SQL26 refuza configurarea: world_raids nu are RLS activ.';
  END IF;
END
$prereq$;

-- Contor cumulativ, NU sold de energie. Atacurile ramase si regenerarea
-- continua sa fie administrate exclusiv de world_raid_start/world_players.
ALTER TABLE public.beta_economy_accounts
  ADD COLUMN IF NOT EXISTS verified_raid_uses bigint NOT NULL DEFAULT 0
  CHECK (verified_raid_uses >= 0);

ALTER TABLE public.beta_economy_ledger
  ADD COLUMN IF NOT EXISTS verified_raid_uses_delta integer NOT NULL DEFAULT 0
  CHECK (verified_raid_uses_delta IN (0,1));

-- SQL25 listeaza explicit sursele permise. Extindem lista pentru acest
-- eveniment verificat pe server, fara a permite credite de aur/XP de la client.
ALTER TABLE public.beta_economy_ledger
  DROP CONSTRAINT IF EXISTS beta_economy_ledger_source_check;
ALTER TABLE public.beta_economy_ledger
  ADD CONSTRAINT beta_economy_ledger_source_check
  CHECK (source IN (
    'migration','admin_adjustment','dungeon_verified','pvp_verified',
    'forge_verified','market_verified','throne_verified',
    'raid_energy_verified'
  ));

-- Operatia este declansata in aceeasi tranzactie cu world_raid_start:
-- energia a fost deja scazuta de server inainte de INSERT world_raids.
-- Nu exista parametru gold/xp/energy primit de la browser.
CREATE OR REPLACE FUNCTION public.beta_economy_capture_world_raid_start()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $capture$
DECLARE
  v_account public.beta_economy_accounts%ROWTYPE;
  v_key text;
  v_revision bigint;
BEGIN
  IF auth.uid() IS DISTINCT FROM NEW.attacker
     OR NOT public.is_beta_admin() THEN
    RAISE EXCEPTION 'Eveniment de raid BETA neautorizat.';
  END IF;
  v_key := 'world-raid-start:' || NEW.id::text;

  INSERT INTO public.beta_economy_accounts(user_id)
  VALUES(NEW.attacker)
  ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO STRICT v_account
  FROM public.beta_economy_accounts
  WHERE user_id=NEW.attacker FOR UPDATE;

  -- Aparare la reexecutarea evenimentului, daca la un moment dat
  -- functia este folosita dintr-un proces de recuperare.
  IF EXISTS (
    SELECT 1 FROM public.beta_economy_ledger
    WHERE user_id=NEW.attacker AND event_key=v_key
  ) THEN RETURN NEW; END IF;

  v_revision := v_account.revision+1;
  UPDATE public.beta_economy_accounts
     SET verified_raid_uses=verified_raid_uses+1,
         revision=v_revision,updated_at=now()
  WHERE user_id=NEW.attacker;

  INSERT INTO public.beta_economy_ledger(
    user_id,event_key,source,
    gold_delta,ore_delta,xp_delta,verified_raid_uses_delta,
    gold_after,ore_after,xp_after,revision
  ) VALUES (
    NEW.attacker,v_key,'raid_energy_verified',
    0,0,0,1,
    v_account.gold,v_account.ore,v_account.xp,v_revision
  );
  RETURN NEW;
END
$capture$;

-- Un singur trigger; nu inlocuieste captura de echipe SQL22.
DROP TRIGGER IF EXISTS beta_economy_world_raid_started ON public.world_raids;
CREATE TRIGGER beta_economy_world_raid_started
AFTER INSERT ON public.world_raids
FOR EACH ROW
EXECUTE FUNCTION public.beta_economy_capture_world_raid_start();

-- API-ul direct nu poate crea raiduri/consuma energie ocolind world_raid_start.
-- RPC-ul SECURITY DEFINER continua sa foloseasca drepturile proprietarului.
REVOKE INSERT, UPDATE, DELETE ON public.world_raids
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.beta_economy_capture_world_raid_start()
  FROM PUBLIC, anon, authenticated;

COMMIT;

-- Diagnostic read-only: toate 6 trebuie sa fie true.
SELECT
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='beta_economy_accounts'
      AND column_name='verified_raid_uses'
  ) AS counter_column_exists,
  EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='beta_economy_ledger'
      AND column_name='verified_raid_uses_delta'
  ) AS ledger_column_exists,
  EXISTS(
    SELECT 1 FROM pg_trigger WHERE tgrelid='public.world_raids'::regclass
      AND tgname='beta_economy_world_raid_started' AND NOT tgisinternal
  ) AS raid_ledger_trigger_exists,
  EXISTS(
    SELECT 1 FROM pg_trigger WHERE tgrelid='public.world_raids'::regclass
      AND tgname='beta_world_shadow_raid_started' AND NOT tgisinternal
  ) AS sql22_trigger_preserved,
  NOT has_table_privilege('authenticated','public.world_raids','INSERT')
    AS direct_raid_insert_denied,
  NOT has_function_privilege('authenticated',
     'public.beta_economy_capture_world_raid_start()','EXECUTE')
    AS mutation_trigger_not_callable;
