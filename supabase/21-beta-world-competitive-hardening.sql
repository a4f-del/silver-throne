-- Silver Throne · PAS 33 / BETA · Garda preliminara a datelor competitive.
-- SQL se ruleaza MANUAL numai in Supabase Silver-Throne-Test. NU LIVE.
-- Necesita 02-lume.sql, 07-beta-access.sql si migrarile ulterioare instalate.
-- Fara resetari: nu sterge raiduri, clasamente, salvari sau bresle.
--
-- ATENTIE: unitatile, nivelurile si rezultatul luptei provin inca din client!
-- Scriptul NU dovedeste victoria ori detinerea echipamentului.
-- Inainte de competitia publica trebuie un motor de lupta autoritativ pe
-- server si surse server-side pentru nivel si statisticile personajelor.
-- Nu promova acest hardening drept anti-cheat complet.
BEGIN;
CREATE TABLE IF NOT EXISTS public.beta_world_publish_audit (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 advertised_power bigint NOT NULL,
 derived_power bigint NOT NULL,
 mismatches integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.beta_world_result_audit (
 raid_id bigint PRIMARY KEY REFERENCES public.world_raids(id) ON DELETE CASCADE,
 reported_win boolean NOT NULL,
 claimed_gold integer,
 claimed_xp integer,
 accepted_gold integer NOT NULL,
 accepted_xp integer NOT NULL,
 reported_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.beta_world_publish_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_world_result_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.beta_world_publish_audit,
                    public.beta_world_result_audit FROM PUBLIC, anon, authenticated;
-- Retains current API and output shapes; no client-side schema change.
create or replace function public.world_join(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record; nm text; v_derived bigint := 0; v_claimed bigint := 0;
begin
  if uid is null or not public.is_beta_admin() then raise exception 'Acces BETA neautorizat'; end if;
  if not world_units_ok(p->'units') then raise exception 'Echipa trimisă nu e validă.'; end if;
  /* The advertised power is NEVER accepted from the client. Power is
     calculated from the published units using the same weights as TT.power.
     Unit values are still client-originated, not trusted ownership proof. */
  select coalesce(round(sum((u.unit->>'hp')::numeric+
                           6*(u.unit->>'atk')::numeric+
                          10*(u.unit->>'def')::numeric)),0)::bigint
    into v_derived from jsonb_array_elements(p->'units') as u(unit);
  begin v_claimed:=greatest(0,least(100000000,coalesce((p->>'power')::numeric,0)))::bigint;
  exception when others then v_claimed:=0; end;
  nm := left(btrim(coalesce(p->>'name', '')), 20); if nm = '' then nm := 'Erou'; end if;
  if not exists (select 1 from world_players where user_id = uid) then
    perform pg_advisory_xact_lock(hashtext('world_join'));      -- două înscrieri simultane nu primesc același loc
    select * into c from world_free_cell();
    insert into world_players (user_id, x, y, name) values (uid, c.cx, c.cy, nm) on conflict (user_id) do nothing;
  end if;
  update world_players set
    name        = nm,
    level       = greatest(1, least(500, coalesce((p->>'level')::numeric, 1)::int)),
    power       = greatest(0,least(100000000,v_derived))::int,
    territories = greatest(0, least(1000, coalesce((p->>'territories')::numeric, 0)::int)),
    stage       = greatest(0, least(20, coalesce((p->>'stage')::numeric, 0)::int)),
    stage_name  = left(coalesce(p->>'stage_name', 'Tabără'), 30),
    title       = left(coalesce(p->>'title', ''), 40),
    hero        = jsonb_build_object('n', left(coalesce(p->'hero'->>'n', nm), 20), 'c', left(coalesce(p->'hero'->>'c', 'Campion'), 20),
                                   'ic', case when coalesce(p->'hero'->>'ic', '') ~ '^[mf][1-9]$' then p->'hero'->>'ic' else '' end),
    units       = p->'units',
    seen_at     = now()
  where user_id = uid;
  INSERT INTO public.beta_world_publish_audit(
    user_id,advertised_power,derived_power,mismatches,updated_at)
  VALUES(uid,v_claimed,greatest(0,least(100000000,v_derived)),
         case when v_claimed<>v_derived then 1 else 0 end,now())
  ON CONFLICT(user_id) DO UPDATE
    SET advertised_power=excluded.advertised_power,
        derived_power=excluded.derived_power,
        mismatches=public.beta_world_publish_audit.mismatches+
          case when excluded.advertised_power<>excluded.derived_power then 1 else 0 end,
        updated_at=now();
  return world_get();
end $$;

create or replace function public.world_raid_finish(p_id bigint, p_win boolean, p_gold int, p_xp int) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r world_raids; a_level int; d_level int;
        v_level int; v_factor numeric; v_gold_cap int; v_xp_cap int;
        v_gold int; v_xp int;
begin
  if uid is null or not public.is_beta_admin() then raise exception 'Acces BETA neautorizat'; end if;
  select * into r from world_raids where id = p_id and attacker = uid for update;
  if not found then raise exception 'Atac necunoscut.'; end if;
  if r.finished_at is not null then return jsonb_build_object('ok', true, 'win', r.win, 'already', true); end if;
  /* Client still declares the battle winner; this is NOT a verified victory.
     Reject arbitrarily inflated claimed rewards in the competition log.
     Caps are intentionally generous to include combat loot and buffs. */
  SELECT greatest(1,least(500,level)) INTO a_level
     FROM public.world_players WHERE user_id=uid;
  SELECT greatest(1,least(500,level)) INTO d_level
     FROM public.world_players WHERE user_id=r.defender;
  a_level:=coalesce(a_level,1);d_level:=coalesce(d_level,1);
  v_level:=least(d_level,a_level+5);
  v_factor:=greatest(.3,least(1.2,d_level::numeric/a_level));
  v_gold_cap:=ceil((60+30*v_level)*v_factor*6+500)::int;
  v_xp_cap:=ceil((20+8*v_level)*v_factor*1.5*4+200)::int;
  v_gold:=greatest(0,least(v_gold_cap,coalesce(p_gold,0)));
  v_xp:=greatest(0,least(v_xp_cap,coalesce(p_xp,0)));
  UPDATE world_raids SET finished_at = now(), win = coalesce(p_win, false),
    gold = v_gold, xp = v_xp
  where id = p_id;
  INSERT INTO public.beta_world_result_audit(
      raid_id,reported_win,claimed_gold,claimed_xp,
      accepted_gold,accepted_xp,reported_at)
  VALUES(p_id,coalesce(p_win,false),p_gold,p_xp,v_gold,v_xp,now())
  ON CONFLICT(raid_id) DO NOTHING;
  if coalesce(p_win, false) then
    update world_players set raids_won = raids_won + 1 where user_id = uid;
    update world_players set def_lost = def_lost + 1 where user_id = r.defender;
  else
    update world_players set raids_lost = raids_lost + 1 where user_id = uid;
    update world_players set def_won = def_won + 1 where user_id = r.defender;
  end if;
  return jsonb_build_object('ok', true, 'win', coalesce(p_win, false));
end $$;
REVOKE ALL ON FUNCTION public.world_join(jsonb),
 public.world_raid_finish(bigint,boolean,integer,integer)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.world_join(jsonb),
 public.world_raid_finish(bigint,boolean,integer,integer) TO authenticated;
COMMIT;
-- Read-only checks: both audit tables and the two RPCs must exist.
SELECT to_regclass('public.beta_world_publish_audit') IS NOT NULL AS publish_audit_exists,
       to_regclass('public.beta_world_result_audit') IS NOT NULL AS result_audit_exists,
       to_regprocedure('public.world_join(jsonb)') IS NOT NULL AS world_join_exists,
       to_regprocedure('public.world_raid_finish(bigint,boolean,integer,integer)')
         IS NOT NULL AS raid_finish_exists;
