-- Silver Throne / SQL35 / Pasul 33: fundatie privata pentru provenienta obiectelor.
-- MANUAL numai in Supabase Silver-Throne-Test, dupa SQL25-26 si SQL34. NU LIVE.
-- Nu importa inventarul clientului, nu acorda obiecte, nu modifica salvarea,
-- nu afecteaza echiparea, PvP, Tron, lootul ori economia jucatorilor.
-- Aceasta migrare instaleaza doar schema de receipt-uri pentru un motor
-- VIITOR care va decide si emite obiecte pe server. Nu este anti-cheat complet.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.game_saves') IS NULL
     OR to_regclass('public.beta_economy_accounts') IS NULL
     OR to_regclass('public.beta_economy_ledger') IS NULL
     OR to_regprocedure('public.is_beta_admin()') IS NULL
     OR to_regprocedure('public.beta_economy_apply_internal(uuid,text,text,bigint,bigint,bigint)') IS NULL THEN
    RAISE EXCEPTION 'SQL35 necesita salvarea si registrul economic SQL25 din Silver-Throne-Test.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='public.guild_boss_hits'::regclass
      AND tgname='beta_economy_guild_boss_hit_created'
      AND NOT tgisinternal AND tgenabled<>'D'
  ) THEN
    RAISE EXCEPTION 'SQL35 necesita SQL34 instalat; nu rula aceasta migrare in LIVE.';
  END IF;
  IF COALESCE((SELECT NOT relrowsecurity FROM pg_class
    WHERE oid='public.beta_economy_ledger'::regclass),true)
     OR has_table_privilege('authenticated','public.beta_economy_ledger','INSERT')
     OR has_table_privilege('anon','public.beta_economy_ledger','INSERT') THEN
    RAISE EXCEPTION 'SQL35: registrul economic trebuie sa fie privat si cu RLS.';
  END IF;
END
$preflight$;

-- Niciun rand nu este generat din game_saves. ID-ul este produs de Postgres.
-- Eventul economic de incredere ramane sursa: fiecare receipt se leaga de
-- un ID al registrului, nu de un UUID, nume ori stat trimis de browser.
-- Nu depozitam aici statistici sau iteme validate superficial din client.
CREATE TABLE IF NOT EXISTS public.beta_item_provenance_receipts (
  receipt_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  event_ledger_id bigint NOT NULL
    REFERENCES public.beta_economy_ledger(id) ON DELETE CASCADE,
  event_item_number integer NOT NULL
    CHECK (event_item_number BETWEEN 1 AND 100),
  template_key text NOT NULL
    CHECK (length(template_key) BETWEEN 1 AND 96
      AND template_key ~ '^[a-z0-9][a-z0-9._:-]*$'),
  item_type text NOT NULL CHECK (item_type IN ('w','a','h','b','j','r')),
  item_level integer NOT NULL CHECK (item_level BETWEEN 1 AND 500),
  item_rarity integer NOT NULL CHECK (item_rarity BETWEEN 0 AND 3),
  item_quality integer NOT NULL CHECK (item_quality BETWEEN 0 AND 100),
  server_roll_seed bigint NOT NULL CHECK (server_roll_seed >= 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beta_item_provenance_event_unique
    UNIQUE (event_ledger_id,event_item_number)
);

CREATE INDEX IF NOT EXISTS beta_item_provenance_event_idx
  ON public.beta_item_provenance_receipts(event_ledger_id);
ALTER TABLE public.beta_item_provenance_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_item_provenance_receipts
  FROM PUBLIC, anon, authenticated;

-- O intrare noua poate face referire doar la o sursa care *va fi*
-- implementata ulterior ca recompensare exclusiv server-side. Nu permitem
-- evenimentele shadow de raid, bossul de breasla ori migrari manuale.
-- Numele sursei singur NU valideaza mecanica: emitentul trebuie sa verifice
-- actiunea si sa genereze itemul/seedul pe server in aceeasi tranzactie.
CREATE OR REPLACE FUNCTION public.beta_item_provenance_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $guard$
DECLARE
  v_source text;
BEGIN
  SELECT l.source INTO v_source
  FROM public.beta_economy_ledger l
  WHERE l.id=NEW.event_ledger_id;
  IF v_source IS NULL OR
     v_source NOT IN ('dungeon_verified','forge_verified') THEN
    RAISE EXCEPTION 'Obiectul necesita un eveniment economic verificat de server.';
  END IF;
  RETURN NEW;
END
$guard$;

DROP TRIGGER IF EXISTS beta_item_provenance_source_guard
  ON public.beta_item_provenance_receipts;
CREATE TRIGGER beta_item_provenance_source_guard
BEFORE INSERT ON public.beta_item_provenance_receipts
FOR EACH ROW EXECUTE FUNCTION public.beta_item_provenance_guard();

REVOKE ALL ON FUNCTION public.beta_item_provenance_guard()
  FROM PUBLIC, anon, authenticated;
-- Intentionat FARA RPC de mint, GRANT sau import din inventarul local.
-- Doar o viitoare actiune autentica, verificata pe server, va putea
-- insera un receipt. Echipa si obiectele existente raman legacy / neschimbate.

COMMIT;

-- Test structural read-only: 9 valori TRUE inseamna doar schema corecta.
SELECT
 to_regclass('public.beta_item_provenance_receipts') IS NOT NULL
   AS receipts_table_exists,
 COALESCE((SELECT relrowsecurity FROM pg_class
   WHERE oid=to_regclass('public.beta_item_provenance_receipts')),false)
   AS receipts_rls_enabled,
 NOT has_table_privilege('authenticated',
   'public.beta_item_provenance_receipts','INSERT')
   AS authenticated_cannot_mint,
 NOT has_table_privilege('authenticated',
   'public.beta_item_provenance_receipts','SELECT')
   AS authenticated_cannot_read,
 NOT has_table_privilege('anon',
   'public.beta_item_provenance_receipts','INSERT')
   AS anonymous_cannot_mint,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.beta_item_provenance_receipts'::regclass
     AND tgname='beta_item_provenance_source_guard'
     AND NOT tgisinternal AND tgenabled<>'D')
   AS verified_source_guard_active,
 NOT has_function_privilege('authenticated',
   'public.beta_item_provenance_guard()','EXECUTE')
   AS source_guard_private,
 EXISTS(SELECT 1 FROM pg_constraint
   WHERE conrelid='public.beta_item_provenance_receipts'::regclass
     AND conname='beta_item_provenance_event_unique')
   AS event_idempotency_constraint,
 EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid='public.guild_boss_hits'::regclass
     AND tgname='beta_economy_guild_boss_hit_created'
     AND NOT tgisinternal AND tgenabled<>'D')
   AS sql34_preserved;

-- Inventar de receipt-uri, agregat; in aceasta etapa se asteapta 0.
-- Nu afiseaza niciun user_id sau obiect individual.
SELECT COUNT(*)::bigint AS server_issued_receipts,
       COUNT(DISTINCT event_ledger_id)::bigint AS source_events
FROM public.beta_item_provenance_receipts;
