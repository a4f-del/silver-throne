-- Silver Throne · SQL44 / BETA · Runele: moneda premium (de test).
-- Rulați DOAR în Supabase Silver-Throne-Test, după SQL07 (is_beta_admin). NU LIVE.
-- Ce face:
--   • rune_wallets: soldul de Rune, Premium până la, Pactul Nicovalei până la, skinurile cumpărate,
--     pachetul de început folosit, câte puncte de expediție s-au cumpărat azi.
--   • rune_ledger: jurnalul fiecărei mișcări (cumpărare, adăugare de administrator, plată simulată).
--   • rune_state()          → starea portofelului + catalogul de prețuri (citire).
--   • rune_buy(item, arg)   → cumpără din catalog cu Rune; serverul verifică soldul și prețul.
--   • rune_admin(op, n)     → doar administratorii BETA: adaugă/setează Rune, simulează plăți, resetează.
-- La lansare: plata reală (Google Play Billing / Stripe) va apela pe server același cod ca rune_admin('pack').
-- Nu atinge aurul, minereul, Tronul, duelurile sau salvările.
BEGIN;

CREATE TABLE IF NOT EXISTS public.rune_wallets (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  runes      integer NOT NULL DEFAULT 0 CHECK (runes >= 0),
  prem_until timestamptz,
  pact_until timestamptz,
  skins      text[] NOT NULL DEFAULT '{}',
  starter    boolean NOT NULL DEFAULT false,
  pts_day    date,
  pts_n      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rune_ledger (
  id         bigserial PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta      integer NOT NULL,
  item       text NOT NULL,
  balance    integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rune_ledger_user_idx ON public.rune_ledger (user_id, created_at DESC);
ALTER TABLE public.rune_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rune_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rune_wallets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.rune_ledger FROM PUBLIC, anon, authenticated;

/* catalogul: prețuri în Rune (100 Rune ≈ 1 € la lansare). Clientul îl afișează, serverul îl aplică. */
CREATE OR REPLACE FUNCTION public.rune_catalog()
 RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'prem15', 450, 'prem30', 800,
    'pact1', 100, 'pact7', 500, 'pact_pct', 8,
    'pts30', 60, 'pts100', 180, 'pts_day_max', 5,
    'skin_umbra', 600, 'skin_merc', 350,
    'rush_min', 1, 'rush_max', 600, 'rush_per_min', 10,
    'starter_runes', 300, 'starter_days', 7,
    'packs', jsonb_build_array(
      jsonb_build_object('n', 500,  'eur', 4.99),
      jsonb_build_object('n', 1200, 'eur', 9.99),
      jsonb_build_object('n', 2600, 'eur', 19.99),
      jsonb_build_object('n', 7000, 'eur', 49.99)),
    'starter_eur', 2.99)
$function$;

/* rândul portofelului (creat la prima nevoie), blocat pentru actualizare */
CREATE OR REPLACE FUNCTION public.rune_row(p_uid uuid)
 RETURNS public.rune_wallets LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare w public.rune_wallets;
begin
  insert into public.rune_wallets (user_id) values (p_uid) on conflict (user_id) do nothing;
  select * into w from public.rune_wallets where user_id = p_uid for update;
  return w;
end $function$;

CREATE OR REPLACE FUNCTION public.rune_json(w public.rune_wallets)
 RETURNS jsonb LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'runes', w.runes,
    'prem_until', case when w.prem_until is null then null else (extract(epoch from w.prem_until) * 1000)::bigint end,
    'pact_until', case when w.pact_until is null then null else (extract(epoch from w.pact_until) * 1000)::bigint end,
    'skins', to_jsonb(w.skins),
    'starter', w.starter,
    'pts_today', case when w.pts_day = current_date then w.pts_n else 0 end,
    'now', (extract(epoch from now()) * 1000)::bigint,
    'admin', public.is_beta_admin(),
    'catalog', public.rune_catalog())
$function$;

CREATE OR REPLACE FUNCTION public.rune_state()
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); w public.rune_wallets;
begin
  if v_uid is null or not public.is_beta_admin() then raise exception 'Acces BETA neautorizat'; end if;
  w := public.rune_row(v_uid);
  return public.rune_json(w);
end $function$;

/* cumpărare cu Rune. p_arg: pentru 'rush' = costul calculat de joc din timpul rămas (1..600). */
CREATE OR REPLACE FUNCTION public.rune_buy(p_item text, p_arg integer DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); w public.rune_wallets; c jsonb := public.rune_catalog();
        v_cost integer; v_grant jsonb := '{}'::jsonb; v_skin text;
        v_base timestamptz;
begin
  if v_uid is null or not public.is_beta_admin() then raise exception 'Acces BETA neautorizat'; end if;
  w := public.rune_row(v_uid);
  if p_item in ('prem15', 'prem30') then
    v_cost := (c ->> p_item)::int;
    v_base := greatest(now(), coalesce(w.prem_until, now()));
    w.prem_until := v_base + make_interval(days => case when p_item = 'prem15' then 15 else 30 end);
  elsif p_item in ('pact1', 'pact7') then
    v_cost := (c ->> p_item)::int;
    v_base := greatest(now(), coalesce(w.pact_until, now()));
    w.pact_until := v_base + make_interval(days => case when p_item = 'pact1' then 1 else 7 end);
  elsif p_item in ('pts30', 'pts100') then
    v_cost := (c ->> p_item)::int;
    if w.pts_day is distinct from current_date then w.pts_day := current_date; w.pts_n := 0; end if;
    if w.pts_n >= (c ->> 'pts_day_max')::int then raise exception 'Ai atins limita de azi pentru puncte (% cumpărări)', c ->> 'pts_day_max'; end if;
    w.pts_n := w.pts_n + 1;
    v_grant := jsonb_build_object('pts', case when p_item = 'pts30' then 30 else 100 end);
  elsif p_item like 'skin:%' then
    v_skin := substr(p_item, 6);
    if v_skin not in ('umbra', 'Războinic', 'Arcaș', 'Paznic', 'Mag', 'Vraci') then raise exception 'Skin necunoscut'; end if;
    if v_skin = any (w.skins) then raise exception 'Ai deja acest skin'; end if;
    v_cost := case when v_skin = 'umbra' then (c ->> 'skin_umbra')::int else (c ->> 'skin_merc')::int end;
    w.skins := array_append(w.skins, v_skin);
  elsif p_item = 'rush' then
    if p_arg is null or p_arg < (c ->> 'rush_min')::int or p_arg > (c ->> 'rush_max')::int then raise exception 'Cost de grăbire invalid'; end if;
    v_cost := p_arg;
    v_grant := jsonb_build_object('rush', true);
  else
    raise exception 'Obiect necunoscut în magazin';
  end if;
  if w.runes < v_cost then raise exception 'Nu ai destule Rune (ai %, trebuie %)', w.runes, v_cost; end if;
  w.runes := w.runes - v_cost;
  update public.rune_wallets set runes = w.runes, prem_until = w.prem_until, pact_until = w.pact_until,
    skins = w.skins, pts_day = w.pts_day, pts_n = w.pts_n, updated_at = now() where user_id = v_uid;
  insert into public.rune_ledger (user_id, delta, item, balance) values (v_uid, -v_cost, p_item, w.runes);
  return public.rune_json(w) || jsonb_build_object('grant', v_grant, 'cost', v_cost);
end $function$;

/* administrator BETA: 'add' (n poate fi negativ), 'set', 'pack' (plată simulată de n Rune),
   'starter' (pachetul de început simulat), 'prem_off', 'reset' (portofel gol, pentru retestare) */
CREATE OR REPLACE FUNCTION public.rune_admin(p_op text, p_n integer DEFAULT 0)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); w public.rune_wallets; c jsonb := public.rune_catalog(); v_old integer;
begin
  if v_uid is null or not public.is_beta_admin() then raise exception 'Doar administratorii BETA'; end if;
  w := public.rune_row(v_uid); v_old := w.runes;
  if p_n is null or abs(p_n) > 1000000 then raise exception 'Valoare invalidă'; end if;
  if p_op = 'add' then w.runes := greatest(0, w.runes + p_n);
  elsif p_op = 'set' then w.runes := greatest(0, p_n);
  elsif p_op = 'pack' then
    if not exists (select 1 from jsonb_array_elements(c -> 'packs') x where (x ->> 'n')::int = p_n) then raise exception 'Pachet necunoscut'; end if;
    w.runes := w.runes + p_n;
  elsif p_op = 'starter' then
    if w.starter then raise exception 'Pachetul de început a fost deja folosit'; end if;
    w.starter := true; w.runes := w.runes + (c ->> 'starter_runes')::int;
    w.prem_until := greatest(now(), coalesce(w.prem_until, now())) + make_interval(days => (c ->> 'starter_days')::int);
    if not ('umbra' = any (w.skins)) then w.skins := array_append(w.skins, 'umbra'); end if;
  elsif p_op = 'prem_off' then w.prem_until := null; w.pact_until := null;
  elsif p_op = 'reset' then w.runes := 0; w.prem_until := null; w.pact_until := null; w.skins := '{}'; w.starter := false; w.pts_day := null; w.pts_n := 0;
  else raise exception 'Operație necunoscută';
  end if;
  update public.rune_wallets set runes = w.runes, prem_until = w.prem_until, pact_until = w.pact_until,
    skins = w.skins, starter = w.starter, pts_day = w.pts_day, pts_n = w.pts_n, updated_at = now() where user_id = v_uid;
  insert into public.rune_ledger (user_id, delta, item, balance) values (v_uid, w.runes - v_old, 'admin:' || p_op, w.runes);
  return public.rune_json(w);
end $function$;

REVOKE ALL ON FUNCTION public.rune_catalog() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rune_row(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rune_json(public.rune_wallets) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rune_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rune_buy(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rune_admin(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rune_catalog() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rune_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rune_buy(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rune_admin(text, integer) TO authenticated;
COMMIT;

-- Verificare (doar citire):
SELECT to_regprocedure('public.rune_state()') IS NOT NULL AS rune_state_exists,
       to_regprocedure('public.rune_buy(text,integer)') IS NOT NULL AS rune_buy_exists,
       to_regprocedure('public.rune_admin(text,integer)') IS NOT NULL AS rune_admin_exists,
       (public.rune_catalog() ->> 'prem30')::int AS premium_30_zile;
