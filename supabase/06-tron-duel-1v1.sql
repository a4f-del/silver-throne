-- Silver Throne — migrare Tron 1v1
-- Aplică manual în Supabase SQL Editor doar după pregătirea clientului.
-- Clientul trebuie să publice un singur erou cu p_ghost.v = 2.
-- ATENȚIE: protecția anti-trișat necesită statistici calculate server-side,
-- din datele reale ale eroului. Limitele int32 de aici sunt numai tehnice.
BEGIN;

ALTER TABLE public.throne_profiles
  ADD COLUMN IF NOT EXISTS duel_version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.throne_publish(p_name text, p_level integer, p_ghost jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); u jsonb; c jsonb; v_out jsonb := '[]'::jsonb; hp numeric; atk numeric; def numeric; v_name text;
begin
  if v_uid is null then raise exception 'Neautentificat'; end if;
  perform public.throne_rollover();
  if p_level is null or p_level < (public.throne_cfg('min_level') #>> '{}')::int then raise exception 'Nivel prea mic: minim %', public.throne_cfg('min_level') #>> '{}'; end if;
  if p_level > 200 then raise exception 'Nivel invalid'; end if;
  if p_ghost is null or jsonb_typeof(p_ghost -> 'units') is distinct from 'array'
     or jsonb_array_length(p_ghost -> 'units') <> 1
     or p_ghost ->> 'v' is distinct from '2' then
    raise exception 'Apărare invalidă: este necesar un singur erou (versiunea 2)';
  end if;
  for u in select * from jsonb_array_elements(p_ghost -> 'units') loop
    c := public.throne_cfg('cap') -> (u ->> 'c');
    if c is null then raise exception 'Apărare invalidă'; end if;
    begin hp := (u ->> 'hp')::numeric; atk := (u ->> 'atk')::numeric; def := (u ->> 'def')::numeric;
    exception when others then raise exception 'Apărare invalidă'; end;
    if hp is null or atk is null or def is null or hp <= 0 or atk < 0 or def < 0
       or hp > 2147483647 or atk > 2147483647 or def > 2147483647 then
      raise exception 'Statistici în afara limitelor tehnice';
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'n', left(coalesce(u ->> 'n', 'Erou'), 20), 'c', u ->> 'c',
      'hp', greatest(1, round(hp))::int,
      'atk', greatest(1, round(atk))::int,
      'def', greatest(0, round(def))::int));
  end loop;
  v_name := coalesce(nullif(left(regexp_replace(coalesce(p_name, ''), '[<>&""]', '', 'g'), 20), ''), 'Jucător');
  insert into public.throne_profiles (user_id, name, level, units, duel_version, updated_at)
  values (v_uid, v_name, p_level, v_out, 2, public.throne_now())
  on conflict (user_id) do update set name = excluded.name, level = excluded.level,
    units = excluded.units, duel_version = excluded.duel_version, updated_at = excluded.updated_at;
  return jsonb_build_object('ok', true, 'units', v_out);
end $function$;

CREATE OR REPLACE FUNCTION public.throne_challenge_start()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); v_reason text; st public.throne_state%rowtype; v_id bigint; v_units jsonb; v_hname text; v_now timestamptz;
begin
  if v_uid is null then raise exception 'Neautentificat'; end if;
  perform public.throne_rollover();
  select * into st from public.throne_state where id = 1 for update;
  v_now := public.throne_now();
  v_reason := public.throne_reason(v_uid);
  if v_reason is not null then raise exception '%', v_reason; end if;
  if exists (select 1 from public.throne_challenges where user_id = v_uid and not finished and started_at > v_now - interval '15 minutes') then raise exception 'Ai deja o provocare în desfășurare'; end if;
  -- Refuzăm apărările vechi fără să consumăm o provocare.
  -- Nu presupunem că primul mercenar dintr-o echipă veche este eroul.
  if st.holder is not null and not exists (
    select 1 from public.throne_profiles p where p.user_id = st.holder
      and p.duel_version = 2 and jsonb_typeof(p.units) = 'array'
      and jsonb_array_length(p.units) = 1
  ) then
    raise exception 'Regele trebuie să-și actualizeze apărarea pentru duelul 1v1';
  end if;
  insert into public.throne_challenges (user_id, week, started_at, holder_at_start)
  values (v_uid, public.throne_week_index(v_now), v_now, st.holder) returning id into v_id;
  if st.holder is null then return jsonb_build_object('id', v_id, 'ghost', null, 'holder_name', null); end if;
  select units, name into v_units, v_hname from public.throne_profiles where user_id = st.holder;
  return jsonb_build_object('id', v_id, 'ghost', jsonb_build_object('units', v_units), 'holder_name', v_hname);
end $function$;

COMMIT;

-- Diagnostic: apărări vechi care trebuie republicate.
SELECT user_id, name, level, duel_version,
       CASE WHEN jsonb_typeof(units) = 'array' THEN jsonb_array_length(units) ELSE NULL END AS luptatori
FROM public.throne_profiles
WHERE duel_version <> 2 OR jsonb_typeof(units) <> 'array'
   OR jsonb_array_length(units) <> 1;
