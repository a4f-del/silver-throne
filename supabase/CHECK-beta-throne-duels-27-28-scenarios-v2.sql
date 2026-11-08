-- Silver Throne BETA — model comparativ Tron v2 (NUMAI CITIRE)
-- Ruleaza in Supabase Silver-Throne-Test, dupa SQL31-33. NU este migrare.
-- Pentru provocarile 27 si 28, testeaza separat:
--  (a) cine incepe; (b) erou Campion normal/abilitate 1.8/2.6;
--  (c) atacurile fantomei la 80%/100%/120% din valoarea nominala.
-- Campionul automat foloseste abilitatea la loviturile 1,4,7,...
-- (cd=2); celelalte doua lovituri sunt normale, conform auto1()+spCd().
-- Eroul are daune brute 100% (fara variatia .85...1.15);
-- fantoma are doar lovituri normale cu atk*1.62, nu critice.
-- Apararea folosita este 100% din DEF publicat, NU 35% ca SQL32.
-- Cap individual: 38% HP tinta. HP porneste la MAXIM, estimativ.
-- NU modelam criticile, sangerarea, vindecarea, efecte pasive,
-- rezistentele legendare, specializarile reale ori echipamentul verificat.
-- Prin urmare nu decide cine a castigat si NU indica trișare.
--
-- Rezultatul este UN SINGUR TABEL, 2 randuri, cu scoruri de scenarii.
-- Nicio instructiune de scriere, niciun profil/nume/user ID in output.

WITH RECURSIVE
snap_raw AS (
  SELECT sh.challenge_id,sh.reported_win,
         sim.outcome AS sql32_outcome,
         sh.challenger_units,sh.holder_units,
         CASE WHEN jsonb_typeof(sh.challenger_units)='array'
                AND jsonb_array_length(sh.challenger_units)=1
              THEN sh.challenger_units->0 END AS a,
         CASE WHEN jsonb_typeof(sh.holder_units)='array'
                AND jsonb_array_length(sh.holder_units)=1
              THEN sh.holder_units->0 END AS h
  FROM public.beta_throne_challenge_shadow sh
  LEFT JOIN public.beta_throne_duel_simulations sim
    ON sim.challenge_id=sh.challenge_id
  WHERE sh.challenge_id IN (27,28)
),
snap AS (
  SELECT challenge_id,reported_win,sql32_outcome,
    greatest(1,round((a->>'hp')::numeric))::bigint AS a_max,
    greatest(1,round((h->>'hp')::numeric))::bigint AS h_max,
    greatest(1,round((a->>'atk')::numeric))::bigint AS a_atk,
    greatest(1,round((h->>'atk')::numeric*1.62))::bigint AS h_atk,
    greatest(0,round((a->>'def')::numeric))::bigint AS a_def,
    greatest(0,round((h->>'def')::numeric))::bigint AS h_def
  FROM snap_raw
  WHERE a IS NOT NULL AND h IS NOT NULL
    AND a->>'c'='Campion'
    AND public.beta_competitive_units_within_bounds(challenger_units)
    AND public.beta_competitive_units_within_bounds(holder_units)
),
settings AS (
  SELECT s.*,first_move.king_first,
         talent.name AS talent,
         talent.skill_multiplier,
         kingroll.name AS king_variation,
         kingroll.king_mult,
         greatest(1,ceil(s.a_max*0.38))::bigint AS a_cap,
         greatest(1,ceil(s.h_max*0.38))::bigint AS h_cap
  FROM snap s
  CROSS JOIN (VALUES (false),(true)) AS first_move(king_first)
  CROSS JOIN (VALUES
    ('normal'::text,1.0::numeric),
    ('campion_1_8'::text,1.8::numeric),
    ('campion_2_6'::text,2.6::numeric)
  ) AS talent(name,skill_multiplier)
  CROSS JOIN (VALUES
    ('0.8'::text,0.8::numeric),
    ('1.0'::text,1.0::numeric),
    ('1.2'::text,1.2::numeric)
  ) AS kingroll(name,king_mult)
),
actions AS (
  SELECT s.challenge_id,s.reported_win,s.sql32_outcome,
         s.king_first,s.talent,s.skill_multiplier,s.king_variation,s.king_mult,
         s.a_max,s.h_max,s.a_atk,s.h_atk,s.a_def,s.h_def,s.a_cap,s.h_cap,
         0::integer AS action_no,0::integer AS challenger_attacks,
         s.a_max::bigint AS challenger_hp,
         s.h_max::bigint AS holder_hp
  FROM settings s

  UNION ALL

  SELECT a.challenge_id,a.reported_win,a.sql32_outcome,
         a.king_first,a.talent,a.skill_multiplier,a.king_variation,a.king_mult,
         a.a_max,a.h_max,a.a_atk,a.h_atk,a.a_def,a.h_def,a.a_cap,a.h_cap,
         a.action_no+1,
         a.challenger_attacks+CASE WHEN turn.challenger_turn THEN 1 ELSE 0 END,
         CASE WHEN turn.challenger_turn THEN a.challenger_hp
           ELSE greatest(0,a.challenger_hp-
             least(a.a_cap,greatest(1,
               round(a.h_atk*a.king_mult-a.a_def)::bigint)))
         END AS challenger_hp,
         CASE WHEN turn.challenger_turn THEN greatest(0,a.holder_hp-
           least(a.h_cap,greatest(1,round(
             a.a_atk*(CASE WHEN mod(a.challenger_attacks,3)=0
               THEN a.skill_multiplier ELSE 1::numeric END)-a.h_def
           )::bigint))) ELSE a.holder_hp END AS holder_hp
  FROM actions a
  CROSS JOIN LATERAL (
    SELECT ((mod(a.action_no,2)=0 AND NOT a.king_first) OR
            (mod(a.action_no,2)=1 AND a.king_first)) AS challenger_turn
  ) turn
  WHERE a.challenger_hp>0 AND a.holder_hp>0 AND a.action_no<120
),
last_state AS (
  SELECT DISTINCT ON (
    challenge_id,king_first,talent,king_variation
  ) challenge_id,reported_win,sql32_outcome,
    king_first,talent,king_variation,action_no,
    challenger_hp,holder_hp,
    CASE WHEN challenger_hp>0 AND holder_hp=0 THEN 'challenger'
         WHEN holder_hp>0 AND challenger_hp=0 THEN 'holder'
         ELSE 'draw' END AS outcome
  FROM actions
  ORDER BY challenge_id,king_first,talent,king_variation,action_no DESC
)
SELECT challenge_id,
       max(sql32_outcome) AS rezultat_sql32,
       bool_or(reported_win) AS victorie_declarata,
       count(*) AS scenarii_total,
       count(*) FILTER (WHERE outcome='challenger') AS scenarii_castigate_erou,
       count(*) FILTER (WHERE outcome='holder') AS scenarii_castigate_rege,
       count(*) FILTER (WHERE outcome='draw') AS scenarii_remiza,
       count(*) FILTER (WHERE talent='normal' AND outcome='challenger')
         AS victorii_fara_abilitati_din_6,
       count(*) FILTER (WHERE talent='campion_1_8' AND outcome='challenger')
         AS victorii_campion_1_8_din_6,
       count(*) FILTER (WHERE talent='campion_2_6' AND outcome='challenger')
         AS victorii_campion_2_6_din_6,
       count(*) FILTER (WHERE king_first AND outcome='challenger')
         AS victorii_cand_regele_incepe_din_9,
       count(*) FILTER (WHERE NOT king_first AND outcome='challenger')
         AS victorii_cand_eroul_incepe_din_9,
       min(action_no) AS actiuni_min,
       max(action_no) AS actiuni_max
FROM last_state
GROUP BY challenge_id
ORDER BY challenge_id;
