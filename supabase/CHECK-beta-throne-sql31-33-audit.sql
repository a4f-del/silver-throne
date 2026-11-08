-- Silver Throne · BETA · diagnostic READ-ONLY dupa SQL31 + SQL32 + SQL33.
-- Doar Supabase Silver-Throne-Test. NU este migrare; nu scrie si nu sterge nimic.
-- Se poate executa oricand, inclusiv inainte de primul duel nou.
-- NU arata nume, user_id, echipament, adrese email sau snapshoturi.
-- Important: simularea SQL32 este o aproximare; nepotrivirea NU dovedeste trișare.

-- A. Sanatatea lantului de audit pentru provocari din ultimele 7 zile.
WITH d AS (
  SELECT sh.challenge_id, sh.challenge_started_at, sh.completed_at,
         sh.holder_id, sh.result_field, sh.reported_win,
         sim.challenge_id AS simulation_id, sim.outcome,
         sim.predicted_challenger_win
  FROM public.beta_throne_challenge_shadow sh
  LEFT JOIN public.beta_throne_duel_simulations sim
    ON sim.challenge_id=sh.challenge_id
  WHERE sh.challenge_started_at >= now()-interval '7 days'
)
SELECT count(*) AS provocari_cu_snapshot,
       count(*) FILTER (WHERE holder_id IS NOT NULL) AS impotriva_regelui,
       count(*) FILTER (WHERE holder_id IS NULL) AS impotriva_garzii,
       count(*) FILTER (WHERE simulation_id IS NOT NULL) AS simulari_preparate,
       count(*) FILTER (WHERE simulation_id IS NULL) AS simulari_lipsa,
       count(*) FILTER (WHERE completed_at IS NOT NULL) AS provocari_finalizate,
       count(*) FILTER (WHERE completed_at IS NULL) AS provocari_in_asteptare,
       count(*) FILTER (WHERE completed_at IS NOT NULL
                        AND reported_win IS NOT NULL) AS finalizari_cu_verdict,
       count(*) FILTER (WHERE completed_at IS NOT NULL
                        AND reported_win IS NULL) AS finalizari_fara_verdict,
       count(*) FILTER (WHERE result_field='client_claim_via_rpc')
         AS declaratii_inregistrate_sql33,
       count(*) FILTER (WHERE holder_id IS NOT NULL
                        AND outcome='unavailable') AS simulari_rege_indisponibile,
       count(*) FILTER (WHERE holder_id IS NOT NULL
                        AND completed_at IS NOT NULL
                        AND reported_win IS NOT NULL
                        AND predicted_challenger_win IS NOT NULL) AS dueluri_comparabile,
       count(*) FILTER (WHERE holder_id IS NOT NULL
                        AND completed_at IS NOT NULL
                        AND reported_win IS NOT NULL
                        AND predicted_challenger_win IS NOT NULL
                        AND reported_win=predicted_challenger_win) AS concordante,
       count(*) FILTER (WHERE holder_id IS NOT NULL
                        AND completed_at IS NOT NULL
                        AND reported_win IS NOT NULL
                        AND predicted_challenger_win IS NOT NULL
                        AND reported_win<>predicted_challenger_win) AS diferite
FROM d;

-- B. Ultimele 12 provocari (fara date de identificare ale jucatorilor).
SELECT sh.challenge_id,
       sh.challenge_started_at,
       CASE WHEN sh.holder_id IS NULL THEN 'Garda Regala'
            ELSE 'Rege 1v1' END AS adversar,
       CASE WHEN sh.completed_at IS NULL THEN 'in asteptare'
            ELSE 'finalizat' END AS stare,
       coalesce(sh.result_field,'necunoscut') AS sursa_verdict,
       sh.reported_win AS victorie_declarata,
       coalesce(sim.outcome,'lipseste_simularea') AS simulator,
       sim.rounds AS runde_simulate,
       CASE
         WHEN sh.completed_at IS NULL THEN 'neterminat'
         WHEN sh.holder_id IS NULL THEN 'garda_nu_e_simulata'
         WHEN sh.reported_win IS NULL THEN 'verdict_absent'
         WHEN sim.predicted_challenger_win IS NULL THEN 'simulare_neconcludenta'
         WHEN sh.reported_win=sim.predicted_challenger_win
           THEN 'concorda_orientativ'
         ELSE 'difera_orientativ'
       END AS comparatie_neoficiala
FROM public.beta_throne_challenge_shadow sh
LEFT JOIN public.beta_throne_duel_simulations sim
  ON sim.challenge_id=sh.challenge_id
ORDER BY sh.challenge_id DESC
LIMIT 12;
