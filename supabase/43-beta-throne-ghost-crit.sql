-- Silver Throne · SQL43 / BETA · apărarea Tronului păstrează criticele eroului.
-- Rulați DOAR în Supabase Silver-Throne-Test, după SQL21 (și 28–33). NU LIVE.
-- Ce schimbă: throne_publish păstrează, pe lângă hp/atk/def, câmpurile opționale
--   cr (șansa de critic, 0..75 %) și cm (multiplicatorul criticului, 1.5..2.5).
-- De ce: fantoma regelui lovește acum critic și își folosește abilitatea clasei
--   (tron-logic.js / specializari.js), în loc de un atac umflat fix ×1.62.
-- Clienții vechi (fără cr) primesc exact ce primeau înainte. Nu atinge duelurile,
-- recompensele, clasamentul sau salvările.
BEGIN;
CREATE OR REPLACE FUNCTION public.throne_publish(p_name text, p_level integer, p_ghost jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid := auth.uid(); u jsonb; c jsonb; v_out jsonb := '[]'::jsonb; hp numeric; atk numeric; def numeric; v_name text;
begin
  if v_uid is null or not public.is_beta_admin() then raise exception 'Acces BETA neautorizat'; end if;
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
       or hp > 1000000 or atk > 1000000 or def > 1000000 then
      raise exception 'Statistici nerealiste pentru fantoma Tronului (limita 1.000.000)';
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'n', left(coalesce(u ->> 'n', 'Erou'), 20), 'c', u ->> 'c',
      'hp', greatest(1, round(hp))::int,
      'atk', greatest(1, round(atk))::int,
      'def', greatest(0, round(def))::int)
      /* SQL43: criticele reale ale eroului, plafonate; lipsesc la clienții vechi (fantoma veche, multiplicator 1.62) */
      || case when jsonb_typeof(u -> 'cr') = 'number' then jsonb_build_object(
           'cr', least(75, greatest(0, round((u ->> 'cr')::numeric)))::int,
           'cm', least(2.5, greatest(1.5, coalesce(case when jsonb_typeof(u -> 'cm') = 'number' then (u ->> 'cm')::numeric end, 1.5))))
         else '{}'::jsonb end);
  end loop;
  v_name := coalesce(nullif(left(regexp_replace(coalesce(p_name, ''), '[<>&""]', '', 'g'), 20), ''), 'Jucător');
  insert into public.throne_profiles (user_id, name, level, units, duel_version, updated_at)
  values (v_uid, v_name, p_level, v_out, 2, public.throne_now())
  on conflict (user_id) do update set name = excluded.name, level = excluded.level,
    units = excluded.units, duel_version = excluded.duel_version, updated_at = excluded.updated_at;
  return jsonb_build_object('ok', true, 'units', v_out);
end $function$;

REVOKE ALL ON FUNCTION public.throne_publish(text,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.throne_publish(text,integer,jsonb) TO authenticated;
COMMIT;
-- Verificare (doar citire): funcția există și conține câmpul cr.
SELECT to_regprocedure('public.throne_publish(text,integer,jsonb)') IS NOT NULL AS throne_publish_exists,
       position('''cr''' in pg_get_functiondef('public.throne_publish(text,integer,jsonb)'::regprocedure)) > 0 AS keeps_crit;
