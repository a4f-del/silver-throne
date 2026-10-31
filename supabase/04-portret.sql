-- ============================================================================
-- Silver Throne — 04-portret.sql
-- Portretul eroului (erou.js) apare și la ceilalți jucători: în Lume, în clasament și în profil.
-- Înlocuiește doar funcția world_join din 02-lume.sql, ca să păstreze și id-ul portretului (m1..m9, f1..f9).
-- Se rulează O DATĂ în Supabase → SQL Editor. (02-lume.sql conține deja aceeași versiune.)
-- ============================================================================

create or replace function public.world_join(p jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c record; nm text;
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;
  if not world_units_ok(p->'units') then raise exception 'Echipa trimisă nu e validă.'; end if;
  nm := left(btrim(coalesce(p->>'name', '')), 20); if nm = '' then nm := 'Erou'; end if;
  if not exists (select 1 from world_players where user_id = uid) then
    perform pg_advisory_xact_lock(hashtext('world_join'));      -- două înscrieri simultane nu primesc același loc
    select * into c from world_free_cell();
    insert into world_players (user_id, x, y, name) values (uid, c.cx, c.cy, nm) on conflict (user_id) do nothing;
  end if;
  update world_players set
    name        = nm,
    level       = greatest(1, least(500, coalesce((p->>'level')::numeric, 1)::int)),
    power       = greatest(0, least(100000000, coalesce((p->>'power')::numeric, 0)::int)),
    territories = greatest(0, least(1000, coalesce((p->>'territories')::numeric, 0)::int)),
    stage       = greatest(0, least(20, coalesce((p->>'stage')::numeric, 0)::int)),
    stage_name  = left(coalesce(p->>'stage_name', 'Tabără'), 30),
    title       = left(coalesce(p->>'title', ''), 40),
    hero        = jsonb_build_object('n', left(coalesce(p->'hero'->>'n', nm), 20), 'c', left(coalesce(p->'hero'->>'c', 'Campion'), 20),
                                   'ic', case when coalesce(p->'hero'->>'ic', '') ~ '^[mf][1-9]$' then p->'hero'->>'ic' else '' end),
    units       = p->'units',
    seen_at     = now()
  where user_id = uid;
  return world_get();
end $$;
