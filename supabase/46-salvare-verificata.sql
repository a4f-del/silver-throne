-- Silver Throne · SQL46 · Salvare verificată de server.
-- Rulați în Supabase Silver-Throne-Test (proiectul jocului), DUPĂ SQL05 (wallet_sync) și SQL45. NU în proiectul LIVE vechi.
-- Ce face:
--   • Salvarea nu se mai scrie direct în game_saves: jocul cheamă public.save_game(p_data), care verifică și corectează.
--   • Aur / minereu / materiale: prin wallet_sync (rezerva de câștig pe oră existentă).
--   • Experiență și nivel: o rezervă de experiență (ca la aur) care se umple în timp; ce trece peste se taie,
--     iar nivelul se recalculează din experiența acceptată.
--   • Puncte: cel mult 200 în bară; rezerva (bp) nu poate crește decât din punctele cumpărate cu Rune.
--   • Antrenament: fiecare rang cel mult 3 + 2 × nivel (ca în joc).
--   • Obiecte NOI (care nu erau în salvarea acceptată anterior): statisticile sunt tăiate la maximul posibil pentru
--     nivelul lor (forjă, +9, legendare) × 1,5. Obiectele deja salvate rămân neatinse.
--   • Prima salvare după instalare devine punctul de plecare acceptat (progresul existent se păstrează).
--   • Administratorii BETA salvează fără verificări (panoul 🛠).
-- Nu șterge salvări sau conturi. Se poate rula de mai multe ori.
BEGIN;

CREATE TABLE IF NOT EXISTS public.st_save_meta (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  txp         numeric NOT NULL DEFAULT 0,          -- experiența totală acceptată
  xp_bucket   numeric NOT NULL DEFAULT 0,          -- rezerva de experiență rămasă
  bucket_at   timestamptz NOT NULL DEFAULT now(),
  rune_seen   bigint NOT NULL DEFAULT 0,           -- ultimul rând rune_ledger numărat pentru puncte
  fixes       integer NOT NULL DEFAULT 0,
  last_fix    jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.st_save_meta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.st_save_meta FROM PUBLIC, anon, authenticated;

/* tabelele jocului: experiența pe nivel (ST_W.need) și maximul statisticilor pe nivelul obiectului (×1,5) */
CREATE OR REPLACE FUNCTION public.st_save_tables()
 RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$ SELECT '{"need":[30,110,255,482,812,1266,1867,2638,3604,4792,6227,7939,9483,11190,13068,15120,17353,19771,22378,25180,28181,31385,34797,38422,42262,46324,50609,55123,59870,64853,70075,75542,81255,87220,93439,99916,106655,113659,120931,128474,136293,144390,152768,161431,170381,179622,189157,198990,209122,219557,230298,241347,252709,264385,276379,288693,301330,314292,327584,341207],"cap":[{"dmg":53,"def":35,"hp":95,"bleed":209,"crit":74,"loot":85,"heal":110,"vd":140,"pd":70,"ph":44,"pf":46},{"dmg":67,"def":46,"hp":121,"bleed":209,"crit":74,"loot":85,"heal":110,"vd":184,"pd":70,"ph":44,"pf":46},{"dmg":80,"def":52,"hp":145,"bleed":209,"crit":74,"loot":85,"heal":110,"vd":208,"pd":70,"ph":44,"pf":46},{"dmg":92,"def":59,"hp":170,"bleed":209,"crit":74,"loot":85,"heal":121,"vd":236,"pd":70,"ph":44,"pf":46},{"dmg":103,"def":67,"hp":196,"bleed":209,"crit":74,"loot":85,"heal":131,"vd":268,"pd":70,"ph":44,"pf":46},{"dmg":116,"def":71,"hp":221,"bleed":209,"crit":74,"loot":85,"heal":142,"vd":284,"pd":70,"ph":44,"pf":46},{"dmg":128,"def":80,"hp":247,"bleed":209,"crit":74,"loot":85,"heal":149,"vd":320,"pd":70,"ph":44,"pf":46},{"dmg":145,"def":88,"hp":271,"bleed":209,"crit":74,"loot":85,"heal":160,"vd":352,"pd":70,"ph":44,"pf":46},{"dmg":154,"def":92,"hp":296,"bleed":209,"crit":74,"loot":85,"heal":170,"vd":368,"pd":70,"ph":44,"pf":46},{"dmg":167,"def":103,"hp":322,"bleed":209,"crit":74,"loot":85,"heal":181,"vd":412,"pd":70,"ph":44,"pf":46},{"dmg":178,"def":109,"hp":347,"bleed":209,"crit":74,"loot":85,"heal":191,"vd":436,"pd":70,"ph":44,"pf":46},{"dmg":188,"def":113,"hp":374,"bleed":209,"crit":80,"loot":85,"heal":200,"vd":452,"pd":70,"ph":44,"pf":46},{"dmg":206,"def":124,"hp":394,"bleed":209,"crit":80,"loot":85,"heal":211,"vd":496,"pd":70,"ph":44,"pf":46},{"dmg":217,"def":128,"hp":421,"bleed":209,"crit":80,"loot":85,"heal":221,"vd":512,"pd":70,"ph":44,"pf":46},{"dmg":229,"def":139,"hp":449,"bleed":209,"crit":74,"loot":85,"heal":232,"vd":556,"pd":70,"ph":44,"pf":46},{"dmg":239,"def":142,"hp":475,"bleed":209,"crit":80,"loot":85,"heal":242,"vd":568,"pd":70,"ph":44,"pf":46},{"dmg":253,"def":149,"hp":500,"bleed":209,"crit":80,"loot":85,"heal":253,"vd":596,"pd":70,"ph":44,"pf":46},{"dmg":265,"def":157,"hp":523,"bleed":209,"crit":80,"loot":85,"heal":263,"vd":628,"pd":70,"ph":44,"pf":46},{"dmg":278,"def":164,"hp":550,"bleed":209,"crit":74,"loot":85,"heal":271,"vd":656,"pd":70,"ph":44,"pf":46},{"dmg":292,"def":170,"hp":575,"bleed":209,"crit":85,"loot":85,"heal":281,"vd":680,"pd":70,"ph":44,"pf":46},{"dmg":302,"def":178,"hp":598,"bleed":209,"crit":74,"loot":85,"heal":292,"vd":712,"pd":70,"ph":44,"pf":46},{"dmg":314,"def":185,"hp":625,"bleed":209,"crit":74,"loot":85,"heal":302,"vd":740,"pd":70,"ph":44,"pf":46},{"dmg":328,"def":193,"hp":647,"bleed":209,"crit":74,"loot":85,"heal":311,"vd":772,"pd":70,"ph":44,"pf":46},{"dmg":340,"def":200,"hp":673,"bleed":209,"crit":74,"loot":85,"heal":322,"vd":800,"pd":70,"ph":44,"pf":46},{"dmg":350,"def":206,"hp":701,"bleed":209,"crit":74,"loot":85,"heal":332,"vd":824,"pd":70,"ph":44,"pf":46},{"dmg":367,"def":214,"hp":727,"bleed":209,"crit":74,"loot":85,"heal":343,"vd":856,"pd":70,"ph":44,"pf":46},{"dmg":376,"def":218,"hp":754,"bleed":209,"crit":74,"loot":85,"heal":353,"vd":872,"pd":70,"ph":44,"pf":46},{"dmg":392,"def":227,"hp":776,"bleed":209,"crit":74,"loot":85,"heal":364,"vd":908,"pd":70,"ph":44,"pf":46},{"dmg":403,"def":235,"hp":802,"bleed":209,"crit":80,"loot":85,"heal":374,"vd":940,"pd":70,"ph":44,"pf":46},{"dmg":415,"def":242,"hp":826,"bleed":209,"crit":74,"loot":85,"heal":385,"vd":968,"pd":70,"ph":44,"pf":46},{"dmg":425,"def":247,"hp":851,"bleed":209,"crit":74,"loot":85,"heal":394,"vd":988,"pd":70,"ph":44,"pf":46},{"dmg":436,"def":256,"hp":877,"bleed":209,"crit":74,"loot":85,"heal":403,"vd":1024,"pd":70,"ph":44,"pf":46},{"dmg":454,"def":263,"hp":901,"bleed":209,"crit":74,"loot":85,"heal":412,"vd":1052,"pd":70,"ph":44,"pf":46},{"dmg":464,"def":271,"hp":926,"bleed":209,"crit":80,"loot":85,"heal":422,"vd":1084,"pd":70,"ph":44,"pf":46},{"dmg":479,"def":278,"hp":955,"bleed":209,"crit":74,"loot":85,"heal":433,"vd":1112,"pd":70,"ph":44,"pf":46},{"dmg":508,"def":281,"hp":980,"bleed":209,"crit":74,"loot":85,"heal":443,"vd":1124,"pd":70,"ph":44,"pf":46},{"dmg":500,"def":292,"hp":1006,"bleed":209,"crit":74,"loot":85,"heal":454,"vd":1168,"pd":70,"ph":44,"pf":46},{"dmg":514,"def":296,"hp":1027,"bleed":209,"crit":74,"loot":85,"heal":464,"vd":1184,"pd":70,"ph":44,"pf":46},{"dmg":529,"def":304,"hp":1052,"bleed":209,"crit":74,"loot":85,"heal":475,"vd":1216,"pd":70,"ph":44,"pf":46},{"dmg":569,"def":311,"hp":1078,"bleed":209,"crit":74,"loot":85,"heal":485,"vd":1244,"pd":70,"ph":44,"pf":46},{"dmg":550,"def":317,"hp":1103,"bleed":209,"crit":74,"loot":85,"heal":496,"vd":1268,"pd":70,"ph":44,"pf":46},{"dmg":611,"def":328,"hp":1130,"bleed":209,"crit":74,"loot":85,"heal":505,"vd":1312,"pd":80,"ph":44,"pf":46},{"dmg":650,"def":332,"hp":1153,"bleed":209,"crit":74,"loot":85,"heal":515,"vd":1328,"pd":70,"ph":44,"pf":46},{"dmg":587,"def":340,"hp":1178,"bleed":209,"crit":74,"loot":85,"heal":523,"vd":1360,"pd":70,"ph":44,"pf":46},{"dmg":601,"def":347,"hp":1207,"bleed":209,"crit":74,"loot":85,"heal":533,"vd":1388,"pd":70,"ph":44,"pf":46},{"dmg":614,"def":353,"hp":1231,"bleed":209,"crit":74,"loot":85,"heal":544,"vd":1412,"pd":70,"ph":44,"pf":46},{"dmg":625,"def":358,"hp":1256,"bleed":209,"crit":80,"loot":85,"heal":554,"vd":1432,"pd":70,"ph":44,"pf":46},{"dmg":640,"def":368,"hp":1279,"bleed":209,"crit":74,"loot":85,"heal":565,"vd":1472,"pd":80,"ph":44,"pf":46},{"dmg":679,"def":374,"hp":1306,"bleed":209,"crit":74,"loot":85,"heal":575,"vd":1496,"pd":70,"ph":44,"pf":46},{"dmg":662,"def":385,"hp":1331,"bleed":209,"crit":74,"loot":85,"heal":586,"vd":1540,"pd":70,"ph":44,"pf":46},{"dmg":673,"def":389,"hp":1357,"bleed":209,"crit":74,"loot":85,"heal":596,"vd":1556,"pd":70,"ph":44,"pf":46},{"dmg":686,"def":394,"hp":1382,"bleed":209,"crit":74,"loot":85,"heal":605,"vd":1576,"pd":70,"ph":44,"pf":46},{"dmg":701,"def":404,"hp":1406,"bleed":209,"crit":80,"loot":85,"heal":616,"vd":1616,"pd":70,"ph":44,"pf":46},{"dmg":712,"def":410,"hp":1432,"bleed":209,"crit":80,"loot":85,"heal":626,"vd":1640,"pd":70,"ph":44,"pf":46},{"dmg":797,"def":418,"hp":1457,"bleed":209,"crit":74,"loot":85,"heal":637,"vd":1672,"pd":70,"ph":44,"pf":46},{"dmg":734,"def":422,"hp":1483,"bleed":209,"crit":80,"loot":85,"heal":647,"vd":1688,"pd":70,"ph":44,"pf":46},{"dmg":748,"def":431,"hp":1508,"bleed":209,"crit":74,"loot":85,"heal":655,"vd":1724,"pd":70,"ph":44,"pf":46},{"dmg":763,"def":439,"hp":1532,"bleed":209,"crit":80,"loot":85,"heal":665,"vd":1756,"pd":70,"ph":44,"pf":46},{"dmg":926,"def":446,"hp":1558,"bleed":209,"crit":74,"loot":85,"heal":676,"vd":1784,"pd":70,"ph":44,"pf":46},{"dmg":787,"def":451,"hp":1583,"bleed":209,"crit":74,"loot":85,"heal":686,"vd":1804,"pd":70,"ph":44,"pf":46}]}'::jsonb $function$;

CREATE OR REPLACE FUNCTION public.st_need(p_l integer)
 RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$ SELECT (public.st_save_tables() -> 'need' ->> (least(60, greatest(1, p_l)) - 1))::numeric $function$;

/* experiența totală pentru (nivel, xp în nivel) și invers */
CREATE OR REPLACE FUNCTION public.st_txp(p_l integer, p_xp numeric)
 RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$
  SELECT coalesce((SELECT sum(public.st_need(i)) FROM generate_series(1, least(60, greatest(1, p_l)) - 1) i), 0) + greatest(0, coalesce(p_xp, 0))
$function$;

CREATE OR REPLACE FUNCTION public.st_lvl_of(p_txp numeric, OUT lvl integer, OUT xp numeric)
 LANGUAGE plpgsql IMMUTABLE SET search_path TO ''
AS $function$
DECLARE rest numeric := greatest(0, p_txp);
BEGIN
  lvl := 1;
  WHILE lvl < 50 AND rest >= public.st_need(lvl) LOOP rest := rest - public.st_need(lvl); lvl := lvl + 1; END LOOP;
  xp := floor(rest);
END $function$;

/* rata rezervei de experiență: ~120 de lupte de căpitan pe oră, plin la 400 */
CREATE OR REPLACE FUNCTION public.st_xp_rate(p_l integer)
 RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$ SELECT ((8 + 4 * least(60, greatest(1, p_l))) * 2.55 * 1.5 * 120)::numeric $function$;

/* taie statisticile unui obiect la maximul nivelului lui (cel mult nivelul jucătorului + 5) */
CREATE OR REPLACE FUNCTION public.st_item_fix(p_it jsonb, p_lvl integer, OUT item jsonb, OUT changed boolean)
 LANGUAGE plpgsql IMMUTABLE SET search_path TO ''
AS $function$
DECLARE l integer; caps jsonb; k text; v numeric; c numeric; s jsonb;
BEGIN
  item := p_it; changed := false;
  IF jsonb_typeof(p_it) <> 'object' OR jsonb_typeof(p_it -> 's') <> 'object' THEN RETURN; END IF;
  l := least(60, greatest(1, least(coalesce(floor((p_it ->> 'l')::numeric)::int, 1), p_lvl + 5)));
  caps := public.st_save_tables() -> 'cap' -> (l - 1);
  s := p_it -> 's';
  FOR k, v IN SELECT key, (value #>> '{}')::numeric FROM jsonb_each(p_it -> 's') WHERE jsonb_typeof(value) = 'number' LOOP
    c := (caps ->> k)::numeric;
    IF c IS NOT NULL AND abs(v) > c THEN s := jsonb_set(s, ARRAY[k], to_jsonb(sign(v) * c)); changed := true; END IF;
  END LOOP;
  IF changed THEN item := jsonb_set(p_it, '{s}', s) - 's0'; END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.save_game(p_data jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid(); prev jsonb; m public.st_save_meta; d jsonb := p_data;
  w jsonb; fix jsonb := '{}'::jsonb; nfix integer := 0; seen text[]; r record;
  claim numeric; gain numeric; ok numeric; h numeric; lv record; lvl integer; pts numeric; bp numeric; allow_bp numeric;
  rune_pts numeric := 0; rune_max bigint := 0; v_first boolean := false; k text; st jsonb; arr jsonb; i integer; j integer; slot text; it record; eq jsonb;
BEGIN
  IF v_uid IS NULL OR NOT public.st_can_play() THEN RAISE EXCEPTION 'Acces refuzat: contul nu poate juca'; END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' OR jsonb_typeof(p_data -> 'fs') <> 'array' THEN RAISE EXCEPTION 'Salvare invalidă'; END IF;
  IF length(p_data::text) > 2000000 THEN RAISE EXCEPTION 'Salvare prea mare'; END IF;

  SELECT game_data INTO prev FROM public.game_saves WHERE user_id = v_uid;

  IF public.is_beta_admin() THEN   -- administratorii testează liber (panoul 🛠)
    INSERT INTO public.game_saves (user_id, game_data, updated_at) VALUES (v_uid, d, now())
      ON CONFLICT (user_id) DO UPDATE SET game_data = excluded.game_data, updated_at = excluded.updated_at;
    INSERT INTO public.st_save_meta (user_id, txp, xp_bucket) VALUES (v_uid, public.st_txp((d ->> 'lvl')::numeric::int, (d ->> 'xp')::numeric), 0)
      ON CONFLICT (user_id) DO UPDATE SET txp = excluded.txp, updated_at = now();
    RETURN jsonb_build_object('ok', true, 'admin', true);
  END IF;

  SELECT * INTO m FROM public.st_save_meta WHERE user_id = v_uid FOR UPDATE;
  v_first := NOT FOUND;
  claim := public.st_txp(coalesce((d ->> 'lvl')::numeric::int, 1), coalesce((d ->> 'xp')::numeric, 0));
  IF to_regclass('public.rune_ledger') IS NOT NULL THEN
    SELECT coalesce(max(id), 0) INTO rune_max FROM public.rune_ledger WHERE user_id = v_uid;
  END IF;

  IF v_first THEN
    -- prima salvare verificată: progresul existent devine punctul de plecare
    INSERT INTO public.st_save_meta (user_id, txp, xp_bucket, rune_seen)
      VALUES (v_uid, claim, public.st_xp_rate(coalesce((d ->> 'lvl')::numeric::int, 1)) * 400 / 120, rune_max)
      RETURNING * INTO m;
  ELSE
    -- experiența: rezerva se umple cu rata nivelului (cel mult 400 de lupte), câștigul peste ea se taie
    lv := public.st_lvl_of(m.txp); lvl := lv.lvl;
    h := least(24, greatest(0, extract(epoch FROM now() - m.bucket_at) / 3600.0));
    m.xp_bucket := least(m.xp_bucket + h * public.st_xp_rate(lvl), public.st_xp_rate(lvl) * 400 / 120);
    gain := claim - m.txp;
    IF gain > m.xp_bucket THEN
      ok := m.txp + m.xp_bucket; m.xp_bucket := 0;
      lv := public.st_lvl_of(ok);
      d := jsonb_set(jsonb_set(d, '{lvl}', to_jsonb(lv.lvl)), '{xp}', to_jsonb(lv.xp));
      fix := fix || jsonb_build_object('lvl', lv.lvl, 'xp', lv.xp); nfix := nfix + 1; m.txp := ok;
    ELSE
      m.xp_bucket := m.xp_bucket - greatest(0, gain); m.txp := claim;   -- XP mai mic e acceptat
    END IF;
    m.bucket_at := now();
  END IF;
  lvl := coalesce((d ->> 'lvl')::numeric::int, 1);

  -- aur, minereu, materiale: rezerva de câștig din portofel (SQL05)
  IF to_regprocedure('public.wallet_sync(bigint,bigint,jsonb,integer)') IS NOT NULL THEN
    BEGIN
      w := public.wallet_sync(coalesce((d ->> 'gold')::numeric, 0)::bigint, coalesce((d ->> 'ore')::numeric, 0)::bigint,
                              CASE WHEN jsonb_typeof(d -> 'mat') = 'object' THEN d -> 'mat' ELSE '{}'::jsonb END, lvl);
    EXCEPTION WHEN OTHERS THEN
      w := NULL; fix := fix || jsonb_build_object('wallet_error', left(SQLERRM, 120));   -- portofelul nu blochează salvarea
    END;
  END IF;
  IF w IS NOT NULL THEN
    IF (w ->> 'gold')::numeric < coalesce((d ->> 'gold')::numeric, 0) OR (w ->> 'ore')::numeric < coalesce((d ->> 'ore')::numeric, 0) OR (w -> 'cut')::boolean THEN
      fix := fix || jsonb_build_object('gold', (w ->> 'gold')::numeric, 'ore', (w ->> 'ore')::numeric, 'mat', w -> 'mats'); nfix := nfix + 1;
    END IF;
    d := jsonb_set(jsonb_set(jsonb_set(d, '{gold}', w -> 'gold'), '{ore}', w -> 'ore'), '{mat}', w -> 'mats');
  END IF;

  -- puncte: bara cel mult 200; rezerva crește doar din Rune
  pts := coalesce((d ->> 'pts')::numeric, 0);
  IF pts > 200 THEN d := jsonb_set(d, '{pts}', to_jsonb(200)); fix := fix || '{"pts":200}'::jsonb; nfix := nfix + 1; END IF;
  IF to_regclass('public.rune_ledger') IS NOT NULL THEN
    SELECT coalesce(sum(CASE item WHEN 'pts30' THEN 30 WHEN 'pts100' THEN 100 ELSE 0 END), 0) INTO rune_pts
      FROM public.rune_ledger WHERE user_id = v_uid AND id > m.rune_seen;
  END IF;
  bp := coalesce((d ->> 'bp')::numeric, 0);
  allow_bp := greatest(coalesce((prev ->> 'bp')::numeric, 120), 0) + rune_pts;
  IF bp > allow_bp THEN d := jsonb_set(d, '{bp}', to_jsonb(allow_bp)); fix := fix || jsonb_build_object('bp', allow_bp); nfix := nfix + 1; END IF;
  m.rune_seen := greatest(m.rune_seen, rune_max);

  -- antrenament: rang ≤ 3 + 2 × nivel
  IF jsonb_typeof(d -> 'st') = 'object' THEN
    st := d -> 'st';
    FOR k IN SELECT key FROM jsonb_each(st) WHERE jsonb_typeof(value) = 'number' AND (value #>> '{}')::numeric > 3 + 2 * lvl LOOP
      st := jsonb_set(st, ARRAY[k], to_jsonb(3 + 2 * lvl)); nfix := nfix + 1;
    END LOOP;
    IF st IS DISTINCT FROM d -> 'st' THEN d := jsonb_set(d, '{st}', st); fix := fix || jsonb_build_object('st', st); END IF;
  END IF;

  -- obiecte noi: amprentele obiectelor din salvarea acceptată anterior
  SELECT coalesce(array_agg(md5(x::text)), '{}') INTO seen FROM (
    SELECT jsonb_array_elements(CASE WHEN jsonb_typeof(prev -> 'inv') = 'array' THEN prev -> 'inv' ELSE '[]' END) x
    UNION ALL SELECT e.value FROM jsonb_array_elements(coalesce(prev -> 'fs', '[]') || coalesce(prev -> 'rs', '[]')) f,
      jsonb_each(CASE WHEN jsonb_typeof(f.value -> 'eq') = 'object' THEN f.value -> 'eq' ELSE '{}' END) e
  ) q;
  IF jsonb_typeof(d -> 'inv') = 'array' THEN
    arr := d -> 'inv';
    IF v_first THEN seen := ARRAY(SELECT md5(x::text) FROM jsonb_array_elements(arr) x); END IF;   -- punctul de plecare: obiectele existente rămân
    IF jsonb_array_length(arr) > 400 THEN
      arr := (SELECT jsonb_agg(value ORDER BY ord) FROM jsonb_array_elements(arr) WITH ORDINALITY t(value, ord) WHERE ord <= 400);
      fix := fix || '{"inv_trim":400}'::jsonb; nfix := nfix + 1;
    END IF;
    FOR i IN 0 .. jsonb_array_length(arr) - 1 LOOP
      IF NOT (md5((arr -> i)::text) = ANY (seen)) THEN
        it := public.st_item_fix(arr -> i, lvl);
        IF it.changed THEN arr := jsonb_set(arr, ARRAY[i::text], it.item); nfix := nfix + 1; fix := fix || '{"items":true}'::jsonb; END IF;
      END IF;
    END LOOP;
    d := jsonb_set(d, '{inv}', arr);
  END IF;
  IF v_first THEN
    seen := seen || ARRAY(SELECT md5(e.value::text) FROM jsonb_array_elements(coalesce(d -> 'fs', '[]') || coalesce(d -> 'rs', '[]')) f,
      jsonb_each(CASE WHEN jsonb_typeof(f.value -> 'eq') = 'object' THEN f.value -> 'eq' ELSE '{}' END) e);
  END IF;
  FOREACH slot IN ARRAY ARRAY['fs', 'rs'] LOOP
    IF jsonb_typeof(d -> slot) = 'array' THEN
      arr := d -> slot;
      FOR j IN 0 .. jsonb_array_length(arr) - 1 LOOP
        eq := arr -> j -> 'eq';
        IF jsonb_typeof(eq) = 'object' THEN
          FOR k IN SELECT key FROM jsonb_each(eq) LOOP
            IF jsonb_typeof(eq -> k) = 'object' AND NOT (md5((eq -> k)::text) = ANY (seen)) THEN
              it := public.st_item_fix(eq -> k, lvl);
              IF it.changed THEN eq := jsonb_set(eq, ARRAY[k], it.item); nfix := nfix + 1; fix := fix || '{"items":true}'::jsonb; END IF;
            END IF;
          END LOOP;
          arr := jsonb_set(arr, ARRAY[j::text, 'eq'], eq);
        END IF;
      END LOOP;
      d := jsonb_set(d, ARRAY[slot], arr);
    END IF;
  END LOOP;

  INSERT INTO public.game_saves (user_id, game_data, updated_at) VALUES (v_uid, d, now())
    ON CONFLICT (user_id) DO UPDATE SET game_data = excluded.game_data, updated_at = excluded.updated_at;
  UPDATE public.st_save_meta SET txp = m.txp, xp_bucket = m.xp_bucket, bucket_at = m.bucket_at, rune_seen = m.rune_seen,
    fixes = fixes + nfix, last_fix = CASE WHEN nfix > 0 THEN fix || jsonb_build_object('at', now()) ELSE last_fix END, updated_at = now()
    WHERE user_id = v_uid;

  RETURN jsonb_build_object('ok', true, 'fixed', nfix > 0, 'fix', fix,
    'data', CASE WHEN fix ? 'items' OR fix ? 'inv_trim' THEN jsonb_build_object('inv', d -> 'inv', 'fs', d -> 'fs', 'rs', d -> 'rs') ELSE NULL END);
END $function$;

REVOKE ALL ON FUNCTION public.st_save_tables() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.st_item_fix(jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_game(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_game(jsonb) TO authenticated;

/* scrierea directă în game_saves se închide: doar save_game (citirea propriului rând rămâne) */
DROP POLICY IF EXISTS game_saves_insert ON public.game_saves;
DROP POLICY IF EXISTS game_saves_update ON public.game_saves;
REVOKE INSERT, UPDATE, TRUNCATE ON TABLE public.game_saves FROM authenticated, anon;
COMMIT;

-- Verificare (doar citire)
SELECT to_regprocedure('public.save_game(jsonb)') IS NOT NULL AS save_game_exists,
       has_table_privilege('authenticated', 'public.game_saves', 'UPDATE') AS scriere_directa_inca_permisa,
       public.st_need(1) AS xp_nivel_1, (public.st_save_tables() -> 'cap' -> 49 ->> 'dmg')::int AS atac_maxim_nivel_50;
