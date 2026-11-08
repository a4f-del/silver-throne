-- Silver Throne — BETA PASUL 27: formații tactice la bossul de breaslă.
-- MANUAL în Supabase Silver-Throne-Test DUPĂ SQL 14-19 anterioare,
-- concret după 17 (contracte fixe) și 18 (contraclasă din echipă).
-- Nu executa în LIVE. Tranzacțional, fără resetări de progres/HP.
--
-- ROLURI: +4% ofensivă per clasă distinctă Războinic/Arcaș/Mag,
-- +4% protecție (Paznic ori Gardian), +4% vindecare (Vraci).
-- Rolurile cresc contribuția de daune a incursiunii; NU vindecă eroii
-- și nu creează un sistem de HP de breaslă în afara bossului.
-- Maxim 3 membri în fantoma Lumii, validare pe serverul Supabase.
-- Capetele 14000 (înainte de contraclasă) / 18000 (după) rămân.
-- Statistica publicată în Lume provine încă inițial din client:
-- etapa 33 trebuie să închidă această vulnerabilitate înainte de public.
BEGIN;
ALTER TABLE public.guild_boss_hits
 ADD COLUMN IF NOT EXISTS attack_bonus integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS protection_bonus integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS healing_bonus integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS counter_triggered boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.guild_api(
 p_action text DEFAULT 'status', p_data jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
 v_uid uuid := auth.uid(); v_action text := lower(trim(coalesce(p_action,'status')));
 v_me public.guild_members%ROWTYPE; v_g public.guilds%ROWTYPE;
 v_w public.guild_weeks%ROWTYPE; v_p public.guild_participation%ROWTYPE;
 v_week date; v_day date := (now() AT TIME ZONE 'Europe/Bucharest')::date;
 v_name text; v_tag text; v_code text; v_gid bigint;
 v_kind text; v_event uuid; v_daily integer; v_cap integer; v_new integer;
 v_damage integer; v_power integer; v_level integer; v_units jsonb; v_counter text;
  v_classes text[] := ARRAY[]::text[]; v_attack_gain integer := 0;
  v_guard_gain integer := 0; v_heal_gain integer := 0;
  v_counter_triggered boolean := false;
 v_claim text; v_threshold numeric; v_minted integer; v_already boolean;
 v_members jsonb; v_list jsonb; v_progress jsonb; v_now timestamptz := now();
BEGIN
 IF v_uid IS NULL OR NOT public.is_beta_admin() THEN
  RAISE EXCEPTION 'Acces permis doar administratorilor BETA.';
 END IF;
 p_data := coalesce(p_data,'{}'::jsonb);
 SELECT * INTO v_me FROM public.guild_members WHERE user_id=v_uid;

 IF v_action='create' THEN
  IF v_me.user_id IS NOT NULL THEN RAISE EXCEPTION 'Esti deja intr-o breasla.'; END IF;
  v_name := trim(coalesce(p_data->>'name',''));
  v_tag := upper(trim(coalesce(p_data->>'tag','')));
  IF char_length(v_name) NOT BETWEEN 3 AND 32 OR v_name !~ '^[[:alnum:] ăâîșțĂÂÎȘȚ_-]+$'
     OR v_tag !~ '^[A-Z0-9]{2,5}$' THEN
   RAISE EXCEPTION 'Nume: 3-32 caractere; sigla: 2-5 litere mari sau cifre.';
  END IF;
  v_code := upper(substr(md5(random()::text||v_uid::text||clock_timestamp()::text),1,8));
  INSERT INTO public.guilds(name,tag,code,founder) VALUES(v_name,v_tag,v_code,v_uid)
  RETURNING * INTO v_g;
  INSERT INTO public.guild_members(user_id,guild_id,role) VALUES(v_uid,v_g.id,'leader');
 ELSIF v_action='join' THEN
  IF v_me.user_id IS NOT NULL THEN RAISE EXCEPTION 'Paraseste breasla actuala mai intai.'; END IF;
  v_code := upper(trim(coalesce(p_data->>'code','')));
  SELECT * INTO v_g FROM public.guilds WHERE code=v_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cod de invitatie necunoscut.'; END IF;
  IF (SELECT count(*) FROM public.guild_members WHERE guild_id=v_g.id)>=20 THEN
   RAISE EXCEPTION 'Breasla are deja 20 de membri.';
  END IF;
  PERFORM public.guild_week_ensure(v_g.id); /* snapshot inainte de join */
  INSERT INTO public.guild_members(user_id,guild_id) VALUES(v_uid,v_g.id);
 ELSIF v_action='leave' THEN
  IF v_me.user_id IS NULL THEN RAISE EXCEPTION 'Nu esti intr-o breasla.'; END IF;
  SELECT * INTO v_g FROM public.guilds WHERE id=v_me.guild_id FOR UPDATE;
  IF v_me.role='leader' THEN
   SELECT user_id INTO v_uid FROM public.guild_members
   WHERE guild_id=v_me.guild_id AND user_id<>auth.uid()
   ORDER BY joined_at,user_id LIMIT 1;
   IF v_uid IS NOT NULL THEN
    UPDATE public.guild_members SET role='leader' WHERE user_id=v_uid;
    UPDATE public.guilds SET founder=v_uid WHERE id=v_me.guild_id;
   END IF;
  END IF;
  PERFORM public.guild_week_ensure(v_me.guild_id); /* snapshot inainte de leave */
  DELETE FROM public.guild_members WHERE user_id=auth.uid();
  IF NOT EXISTS (SELECT 1 FROM public.guild_members WHERE guild_id=v_me.guild_id) THEN
   DELETE FROM public.guilds WHERE id=v_me.guild_id;
  END IF;
  v_uid:=auth.uid();
 ELSIF v_action IN ('report','boss','claim') THEN
  IF v_me.user_id IS NULL THEN RAISE EXCEPTION 'Trebuie sa intri intr-o breasla.'; END IF;
  v_gid:=v_me.guild_id;
  v_week:=public.guild_week_ensure(v_gid);
  INSERT INTO public.guild_participation(guild_id,week_start,user_id)
  VALUES(v_gid,v_week,v_uid)
  ON CONFLICT DO NOTHING;
  SELECT * INTO v_p FROM public.guild_participation
  WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid FOR UPDATE;
  SELECT * INTO v_w FROM public.guild_weeks WHERE guild_id=v_gid AND week_start=v_week FOR UPDATE;

  IF v_action='report' THEN
   IF p_data->>'week' IS DISTINCT FROM v_week::text THEN
    RAISE EXCEPTION 'Evenimentul apartine altei saptamani.';
   END IF;
   v_kind:=coalesce(p_data->>'kind','');
   IF v_kind NOT IN('dungeon','hard_boss','tower') THEN RAISE EXCEPTION 'Eveniment necunoscut.'; END IF;
   v_event := nullif(p_data->>'id','')::uuid;
   IF v_event IS NULL THEN RAISE EXCEPTION 'Evenimentul trebuie sa aiba un ID.'; END IF;
   -- Limite per membru, pe zi: reduc abuzul; evenimentele locale nu sunt autoritative.
   v_cap:=CASE v_kind WHEN 'dungeon' THEN 40 WHEN 'hard_boss' THEN 12 ELSE 120 END;
   SELECT count(*) INTO v_daily FROM public.guild_events
   WHERE user_id=v_uid AND kind=v_kind
     AND (created_at AT TIME ZONE 'Europe/Bucharest')::date=v_day;
   IF v_daily>=v_cap THEN RAISE EXCEPTION 'Limita zilnica de raportare pentru acest obiectiv a fost atinsa.'; END IF;
   INSERT INTO public.guild_events(user_id,event_id,guild_id,kind)
   VALUES(v_uid,v_event,v_gid,v_kind) ON CONFLICT DO NOTHING;
   IF FOUND THEN
    IF v_kind='dungeon' THEN
     UPDATE public.guild_participation SET dungeons=dungeons+1
      WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid;
     UPDATE public.guild_weeks SET dungeons=dungeons+1 WHERE guild_id=v_gid AND week_start=v_week;
    ELSIF v_kind='hard_boss' THEN
     UPDATE public.guild_participation SET hard_boss=hard_boss+1
      WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid;
     UPDATE public.guild_weeks SET hard_boss=hard_boss+1 WHERE guild_id=v_gid AND week_start=v_week;
    ELSE
     UPDATE public.guild_participation SET tower=tower+1
      WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid;
     UPDATE public.guild_weeks SET tower=tower+1 WHERE guild_id=v_gid AND week_start=v_week;
    END IF;
   END IF;
  ELSIF v_action='boss' THEN
   IF v_w.boss_hp<=0 THEN RAISE EXCEPTION 'Capitanul a fost invins pentru aceasta saptamana.'; END IF;
   SELECT count(*) INTO v_daily FROM public.guild_boss_hits
     WHERE user_id=v_uid AND local_day=v_day;
   IF v_daily>=2 THEN RAISE EXCEPTION 'Ai consumat cele 2 incercari gratuite de azi.'; END IF;
   -- Puterea este calculata pe server din profilul publicat in Lume,
   -- NU din numarul de daune transmis de client.
   SELECT greatest(1,least(100,level)),greatest(0,least(50000,power)),
          coalesce(units,'[]'::jsonb)
   INTO v_level,v_power,v_units
   FROM public.world_players WHERE user_id=v_uid;
   v_level:=coalesce(v_level,1);v_power:=coalesce(v_power,0);
   v_units:=coalesce(v_units,'[]'::jsonb);
   v_counter := CASE mod((v_week-date '2026-01-05')/7,3)
    WHEN 0 THEN 'Vraci' WHEN 1 THEN 'Arcas' ELSE 'Paznic' END;
   v_damage:=least(14000,2500+v_level*55+v_power/250);
   /* Formația reală publicată la server este validată ca max. 3 unități.
      Datele clientului transmise în p_data NU aleg clasele sau bonusurile.
      Rolurile sunt un rezumat tactic, fără a modifica viața eroului:
      ofensivă = +4%/clasă (Războinic, Arcaș, Mag);
      protecție = +4% continuitatea atacului (Paznic sau Gardian);
      vindecare = +4% continuitatea atacului (Vraci).
      Se păstrează plafonul 14.000 înainte de contraclasă și 18.000 după.
      Bonusurile de rol reprezintă daune utile ale incursiunii, nu HP
      vindecat in contul personajului. */
   IF public.world_units_ok(v_units) THEN
     SELECT coalesce(array_agg(u.unit->>'c'),ARRAY[]::text[])
     INTO v_classes FROM jsonb_array_elements(v_units) AS u(unit);
   ELSE
     v_classes := ARRAY[]::text[];
   END IF;
   v_attack_gain := round(v_damage * .04 * (
     CASE WHEN 'Războinic'=ANY(v_classes) THEN 1 ELSE 0 END+
     CASE WHEN 'Arcaș'=ANY(v_classes) THEN 1 ELSE 0 END+
     CASE WHEN 'Mag'=ANY(v_classes) THEN 1 ELSE 0 END))::integer;
   v_guard_gain := round(v_damage * .04 * (
     CASE WHEN 'Paznic'=ANY(v_classes) OR 'Gardian'=ANY(v_classes) THEN 1 ELSE 0 END))::integer;
   v_heal_gain := round(v_damage * .04 * (
     CASE WHEN 'Vraci'=ANY(v_classes) THEN 1 ELSE 0 END))::integer;
   v_damage := least(14000,v_damage+v_attack_gain+v_guard_gain+v_heal_gain);
   v_counter_triggered := (v_counter='Arcas' AND 'Arcaș'=ANY(v_classes))
      OR (v_counter<>'Arcas' AND v_counter=ANY(v_classes));
   IF v_counter_triggered THEN
     v_damage:=least(18000,round(v_damage*1.25)::integer);
   END IF;
   v_damage:=least(v_damage,v_w.boss_hp::integer);
   INSERT INTO public.guild_boss_hits(guild_id,week_start,user_id,local_day,damage,
     attack_bonus,protection_bonus,healing_bonus,counter_triggered)
   VALUES(v_gid,v_week,v_uid,v_day,v_damage,
     v_attack_gain,v_guard_gain,v_heal_gain,v_counter_triggered);
   UPDATE public.guild_weeks SET boss_hp=greatest(0,boss_hp-v_damage)
    WHERE guild_id=v_gid AND week_start=v_week;
   UPDATE public.guild_participation SET boss_hits=boss_hits+1,boss_damage=boss_damage+v_damage
    WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid;
  ELSE
   v_claim:=lower(coalesce(p_data->>'tier',''));
   SELECT * INTO v_w FROM public.guild_weeks WHERE guild_id=v_gid AND week_start=v_week;
   SELECT * INTO v_p FROM public.guild_participation WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid;
   IF v_p.dungeons+v_p.hard_boss+v_p.tower+v_p.boss_hits < 3 THEN
    RAISE EXCEPTION 'Ai nevoie de minim 3 contributii personale in aceasta saptamana.';
   END IF;
   IF v_claim='boss' THEN
    IF v_w.boss_hp>0 OR v_p.boss_hits=0 THEN RAISE EXCEPTION 'Ajuta la invingerea capitanului mai intai.'; END IF;
    IF v_p.boss_claimed THEN RAISE EXCEPTION 'Ai revendicat deja premiul capitanului.'; END IF;
    UPDATE public.guild_participation SET boss_claimed=true
     WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid;
    v_minted:=20;
   ELSE
    v_threshold:=CASE v_claim WHEN 'bronz' THEN .25 WHEN 'argint' THEN .60 WHEN 'aur' THEN 1 ELSE null END;
    IF v_threshold IS NULL THEN RAISE EXCEPTION 'Treapta necunoscuta.'; END IF;
    IF v_w.dungeons<ceil(v_w.goal_dungeons*v_threshold)
       OR v_w.hard_boss<ceil(v_w.goal_hard_boss*v_threshold)
       OR v_w.tower<ceil(v_w.goal_tower*v_threshold) THEN
      RAISE EXCEPTION 'Breasla nu a atins inca aceasta treapta.'; END IF;
    IF (v_claim='bronz' AND v_p.bronze_claimed) OR (v_claim='argint' AND v_p.silver_claimed)
       OR (v_claim='aur' AND v_p.gold_claimed) THEN
      RAISE EXCEPTION 'Recompensa a fost deja revendicata.'; END IF;
    UPDATE public.guild_participation SET
      bronze_claimed=bronze_claimed OR v_claim='bronz',
      silver_claimed=silver_claimed OR v_claim='argint',
      gold_claimed=gold_claimed OR v_claim='aur'
    WHERE guild_id=v_gid AND week_start=v_week AND user_id=v_uid;
    v_minted:=CASE v_claim WHEN 'bronz' THEN 10 WHEN 'argint' THEN 20 ELSE 40 END;
   END IF;
   UPDATE public.guild_members SET marks=marks+v_minted WHERE user_id=v_uid;
  END IF;
 ELSIF v_action<>'status' THEN RAISE EXCEPTION 'Actiune necunoscuta.'; END IF;

 -- Starea serverului, exclusiv datele relevante pentru membrii breslei.
 v_uid:=auth.uid();
 SELECT * INTO v_me FROM public.guild_members WHERE user_id=v_uid;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',g.id,'name',g.name,'tag',g.tag,
   'count',(SELECT count(*) FROM public.guild_members m WHERE m.guild_id=g.id)
 ) ORDER BY g.id DESC),'[]'::jsonb) INTO v_list
 FROM (SELECT id,name,tag FROM public.guilds ORDER BY id DESC LIMIT 30) g;
 IF v_me.user_id IS NULL THEN
  RETURN jsonb_build_object('guild',null,'guilds',v_list,'server_at',now());
 END IF;
 v_week:=public.guild_week_ensure(v_me.guild_id);
 SELECT * INTO v_g FROM public.guilds WHERE id=v_me.guild_id;
 SELECT * INTO v_w FROM public.guild_weeks WHERE guild_id=v_me.guild_id AND week_start=v_week;
 INSERT INTO public.guild_participation(guild_id,week_start,user_id)
 VALUES(v_me.guild_id,v_week,v_uid) ON CONFLICT DO NOTHING;
 SELECT * INTO v_p FROM public.guild_participation
 WHERE guild_id=v_me.guild_id AND week_start=v_week AND user_id=v_uid;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'name',coalesce(wp.name,'Erou'),'role',m.role,'marks',m.marks,
  'dungeons',coalesce(p.dungeons,0),'hard_boss',coalesce(p.hard_boss,0),
  'tower',coalesce(p.tower,0),'hits',coalesce(p.boss_hits,0)
 ) ORDER BY m.joined_at),'[]'::jsonb) INTO v_members
 FROM public.guild_members m LEFT JOIN public.world_players wp ON wp.user_id=m.user_id
 LEFT JOIN public.guild_participation p ON p.guild_id=m.guild_id AND p.week_start=v_week AND p.user_id=m.user_id
 WHERE m.guild_id=v_me.guild_id;
 RETURN jsonb_build_object(
  'guild',jsonb_build_object('id',v_g.id,'name',v_g.name,'tag',v_g.tag,
    'code',v_g.code,'role',v_me.role,'marks',v_me.marks,'week',v_week,
    'members',v_members,'member_count',jsonb_array_length(v_members)),
  'guilds',v_list,
  'contract',jsonb_build_object('dungeons',v_w.dungeons,'hard_boss',v_w.hard_boss,'tower',v_w.tower,
     'active_at_start',v_w.active_at_start,
     'goals',jsonb_build_object('dungeons',v_w.goal_dungeons,
       'hard_boss',v_w.goal_hard_boss,'tower',v_w.goal_tower),
    'personal',jsonb_build_object('dungeons',v_p.dungeons,'hard_boss',v_p.hard_boss,
      'tower',v_p.tower,'boss_hits',v_p.boss_hits),
    'claimed',jsonb_build_object('bronz',v_p.bronze_claimed,'argint',v_p.silver_claimed,
      'aur',v_p.gold_claimed,'boss',v_p.boss_claimed)),
  'boss',jsonb_build_object('hp',v_w.boss_hp,'max',v_w.boss_max,
    'formation_rules',true,
    'counter',CASE mod((v_week-date '2026-01-05')/7,3)
      WHEN 0 THEN 'Vraci' WHEN 1 THEN 'Arcaș' ELSE 'Paznic' END,
    'ability',CASE mod((v_week-date '2026-01-05')/7,3)
      WHEN 0 THEN 'poison' WHEN 1 THEN 'storm' ELSE 'wave' END,
    'hits_today',(SELECT count(*) FROM public.guild_boss_hits WHERE user_id=v_uid AND local_day=v_day),
    'personal_damage',v_p.boss_damage,
    'last_hit',(SELECT jsonb_build_object(
       'damage',h.damage,'attack_bonus',h.attack_bonus,
       'protection_bonus',h.protection_bonus,
       'healing_bonus',h.healing_bonus,'counter_triggered',h.counter_triggered)
       FROM public.guild_boss_hits h
       WHERE h.guild_id=v_me.guild_id AND h.week_start=v_week AND h.user_id=v_uid
       ORDER BY h.id DESC LIMIT 1)),
  'server_at',now());
END $fn$;



REVOKE ALL ON FUNCTION public.guild_api(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guild_api(text,jsonb) TO authenticated;
COMMIT;
