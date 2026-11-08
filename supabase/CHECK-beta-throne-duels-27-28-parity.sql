-- Silver Throne BETA — DIAGNOSTIC DOAR CITIRE: duelurile 27 si 28.
-- Nu este migrare. DOAR Supabase Silver-Throne-Test.
-- Nu foloseste nume, user_id, email, echipament ori caracteristici personale.
-- Expune valori APROXIMATIVE de dauna, NU valideaza victoria si NU indica frauda.
-- Pentru verificarea inițiativei alternative reutilizam funcția pura SQL32
-- cu id+1, care inverseaza paritatea. Nu actualizeaza nicio inregistrare.

WITH raw AS (
 SELECT sh.challenge_id, sh.reported_win, sh.result_field,
        sh.completed_at,
        sim.outcome AS initial_model,
        sim.rounds AS model_rounds,
        sh.challenger_units, sh.holder_units,
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
), stats AS (
 SELECT challenge_id, reported_win, result_field, completed_at,
        initial_model, model_rounds, challenger_units, holder_units,
        a->>'c' AS challenger_class,
        CASE WHEN a IS NOT NULL AND h IS NOT NULL THEN
          greatest(1,round((a->>'hp')::numeric)) END AS a_hp,
        CASE WHEN a IS NOT NULL AND h IS NOT NULL THEN
          greatest(1,round((h->>'hp')::numeric)) END AS h_hp,
        CASE WHEN a IS NOT NULL AND h IS NOT NULL THEN
          greatest(1,round((a->>'atk')::numeric)) END AS a_atk,
        CASE WHEN a IS NOT NULL AND h IS NOT NULL THEN
          greatest(1,round((h->>'atk')::numeric*1.62)) END AS h_ghost_atk,
        CASE WHEN a IS NOT NULL AND h IS NOT NULL THEN
          greatest(0,round((a->>'def')::numeric)) END AS a_def,
        CASE WHEN a IS NOT NULL AND h IS NOT NULL THEN
          greatest(0,round((h->>'def')::numeric)) END AS h_def
 FROM raw
)
SELECT challenge_id,
       result_field AS sursa_verdict,
       reported_win AS victorie_inregistrata,
       initial_model AS simulator_actual,
       model_rounds AS runde_simulate,
       (public.beta_throne_duel_simulate_baseline(
          challenger_units,holder_units,challenge_id+1
        )->>'outcome') AS simulator_cu_initiativa_inversata,
       challenger_class AS clasa_provocator,
       CASE WHEN a_hp IS NULL THEN NULL ELSE
         greatest(1,ceil(a_hp*0.38)) END AS cap_lovitura_erou,
       CASE WHEN h_hp IS NULL THEN NULL ELSE
         greatest(1,ceil(h_hp*0.38)) END AS cap_lovitura_rege,
       CASE WHEN a_atk IS NULL THEN NULL ELSE
         greatest(1,round(a_atk-h_def*0.35)) END
         AS provocator_lovitura_normala_sql32,
       CASE WHEN a_atk IS NULL THEN NULL ELSE
         greatest(1,round(a_atk-h_def)) END
         AS provocator_lovitura_normala_motor_medie,
       CASE WHEN a_atk IS NULL OR challenger_class<>'Campion'
            THEN NULL ELSE
         least(greatest(1,ceil(h_hp*0.38)),
              greatest(1,round(a_atk*1.8-h_def))) END
         AS campion_abilitate_1_8_fara_crit,
       CASE WHEN a_atk IS NULL OR challenger_class<>'Campion'
            THEN NULL ELSE
         least(greatest(1,ceil(h_hp*0.38)),
              greatest(1,round(a_atk*2.6-h_def))) END
         AS campion_abilitate_2_6_fara_crit,
       CASE WHEN h_ghost_atk IS NULL THEN NULL ELSE
         greatest(1,round(h_ghost_atk-a_def*0.35)) END
         AS rege_lovitura_sql32,
       CASE WHEN h_ghost_atk IS NULL THEN NULL ELSE
         greatest(1,round(h_ghost_atk-a_def)) END
         AS rege_lovitura_motor_medie,
       completed_at IS NOT NULL AS audit_finalizat
FROM stats ORDER BY challenge_id;

-- Atentie: campion_abilitate_* sunt scenarii teoretice, nu actiuni
-- observate. Nu includ critice, afixe, mana, statut sau efecte ale
-- specializarii. Initiativa de la SQL32 e paritatea ID-ului, nu cea din joc.
