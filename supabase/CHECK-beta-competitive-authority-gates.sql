-- Silver Throne / Pasul 33 / BETA - diagnostic read-only al autoritatii.
-- Ruleaza MANUAL numai in SQL Editor Silver-Throne-Test, dupa SQL14 si SQL21-33.
-- NU este o migrare; nu modifica utilizatori, salvări, guild marks, joc sau LIVE.
-- Prezenta unui RPC/trigger NU certifica proprietatea itemelor ori victoria.
-- Rezultatele BLOCKER sunt intentionat false pana exista dovezi server-side + QA.
--
-- Rezultat 1: inventar verificabil al mecanismelor si blocajelor obligatorii.
WITH evidence(control, exists_on_server, detail) AS (
  VALUES
    ('economy_ledger_sql25',
      to_regclass('public.beta_economy_ledger') IS NOT NULL,
      'Registru separat: existenta nu confirma plata recompenselor verificate.'),
    ('raid_energy_ledger_sql26',
      EXISTS (
        SELECT 1 FROM pg_trigger
         WHERE tgname='beta_economy_world_raid_started'
           AND NOT tgisinternal AND tgenabled<>'D'
      ),
      'Trigger SQL26: consumul de energie incepe pe server, dar nu dovedeste victoria.'),
    ('world_simulator_sql27',
      to_regclass('public.beta_world_combat_simulations') IS NOT NULL,
      'Simulator orientativ, fara paritate sau verdict oficial.'),
    ('save_audit_sql23',
      to_regclass('public.beta_save_progress_audit') IS NOT NULL,
      'Audit de salvare declarat de browser, nu inventar autoritativ.'),
    ('throne_snapshot_sql31',
      to_regclass('public.beta_throne_challenge_shadow') IS NOT NULL,
      'Snapshot publicat de client, pastrat pe server.'),
    ('throne_simulator_sql32',
      to_regclass('public.beta_throne_duel_simulations') IS NOT NULL,
      'Simulator pasiv, fara critice / vindecare / abilitati complete.'),
    ('throne_claim_sql33',
      to_regprocedure('public.beta_throne_challenge_finish_audited(bigint,boolean)') IS NOT NULL,
      'RPC consemneaza p_win declarat de browser; nu valideaza victoria.')
), blockers(control,detail) AS (
  VALUES
    ('server_owned_progress','Nivelul, XP-ul si salvarea game_saves sunt inca controlabile de client.'),
    ('server_owned_inventory','Inventarul, itemele si echipamentul nu au provenienta autoritativa.'),
    ('server_decided_pvp','world_raid_finish primeste inca p_win; SQL27 nu este arbitru.'),
    ('server_decided_throne','throne_challenge_finish primeste inca p_win; SQL32 nu este arbitru.'),
    ('guild_pve_provenance','guild_api report primeste kind si UUID create in client.'),
    ('authenticated_abuse_qa','Nu sunt incheiate teste autentificate cu replay, race si requesturi falsificate.')
)
SELECT 'evidence_only'::text AS category,
       control, exists_on_server AS observed,
       FALSE AS sufficient_for_public_competition, detail
  FROM evidence
UNION ALL
SELECT 'release_blocker', control, FALSE, FALSE, detail
  FROM blockers
ORDER BY category, control;

-- Rezultat 2: frecventa rapoartelor de breasla in ultimele 7 zile.
-- Nu afisam user_id, ID-uri de evenimente ori nume; doar agregate.
-- Un varf de activitate NU este dovada de frauda (import, joc rapid, retry).
SELECT kind, count(*)::bigint AS reports_7d,
       count(DISTINCT user_id)::bigint AS reporters_7d
FROM public.guild_events
WHERE created_at >= now() - interval '7 days'
GROUP BY kind
ORDER BY kind;

-- Rezultat 3: cate intervale de un minut per jucator au volum neobisnuit.
-- Pragurile sunt orientative, nu limite de joc si NU declanseaza sanctiuni.
WITH bursts AS (
  SELECT kind,user_id,date_trunc('minute',created_at) AS minute_bucket,
         count(*)::bigint AS events_in_minute
  FROM public.guild_events
  WHERE created_at >= now() - interval '7 days'
  GROUP BY kind,user_id,date_trunc('minute',created_at)
  HAVING count(*) >= CASE kind
    WHEN 'tower' THEN 10 WHEN 'dungeon' THEN 5
    WHEN 'hard_boss' THEN 3 ELSE 10 END
)
SELECT kind, count(*)::bigint AS unusual_user_minutes,
       max(events_in_minute)::bigint AS max_reports_in_a_minute
FROM bursts
GROUP BY kind
ORDER BY kind;
