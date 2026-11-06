-- Silver Throne BETA — Bazar (SQL furnizat din configuratia LIVE).
-- Ruleaza dupa 00-beta-core.sql, 01-throne-beta.sql, 02-lume.sql,
-- 04-portret.sql si 05-portofel.sql, DOAR in proiectul BETA.
-- Acest script adauga si pend_gold, si inlocuieste wallet_sync.
alter table public.wallet add column if not exists pend_gold bigint not null default 0;

create table if not exists public.bazar_listings (
  id          bigint generated always as identity primary key,
  seller      uuid not null references auth.users on delete cascade,
  item        jsonb not null,
  ihash       text not null,
  price       bigint not null check (price > 0),
  item_lvl    int not null,
  item_t      text not null,
  item_r      int not null,
  state       text not null default 'open',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '48 hours',
  buyer       uuid,
  closed_at   timestamptz
);
create index if not exists bazar_open on public.bazar_listings (item_t, item_lvl) where state = 'open';
create index if not exists bazar_seller on public.bazar_listings (seller, created_at desc);

create table if not exists public.bazar_inbox (
  id         bigint generated always as identity primary key,
  owner      uuid not null references auth.users on delete cascade,
  item       jsonb not null,
  reason     text not null,
  created_at timestamptz not null default now(),
  claimed    boolean not null default false
);
create index if not exists bazar_inbox_owner on public.bazar_inbox (owner) where not claimed;

alter table public.bazar_listings enable row level security;
alter table public.bazar_inbox   enable row level security;
drop policy if exists bazar_read on public.bazar_listings;
create policy bazar_read on public.bazar_listings for select using (state = 'open' or seller = auth.uid() or buyer = auth.uid());
drop policy if exists inbox_read on public.bazar_inbox;
create policy inbox_read on public.bazar_inbox for select using (auth.uid() = owner);
-- scriere: nicio politica; totul trece prin functiile de mai jos

-- ---------------------------------------------------------------- REGULILE
create or replace function public.bazar_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object('fee_list', 0.02, 'fee_sale', 0.05, 'max_open', 10, 'hours', 48, 'min_lvl', 15, 'max_mult', 50)
$$;
create or replace function public.bazar_shop(l int, r int) returns bigint language sql immutable as $$ select (4 + l * 3 * (r + 1))::bigint $$;
create or replace function public.bazar_cap(k text, l int) returns numeric language sql immutable as $$
  select (case k when 'dmg' then 34 + 9.29 * l when 'def' then 15 + 5.14 * l when 'hp' then 67 + 17.49 * l
                 when 'bleed' then 95 + 2.69 * l when 'crit' then 48 + 0.56 * l when 'loot' then 34 + 3.5 * l
                 when 'heal' then 55 + 6.7 * l when 'vd' then 24 when 'pd' then 34 + 0.43 * l
                 when 'ph' then 14 + 0.57 * l when 'pf' then 7 + 0.51 * l else -1 end) * 1.15 + 3
$$;

create or replace function public.bazar_valid(p jsonb, p_lvl int) returns text language plpgsql immutable as $$
declare k text; v jsonb; l int; c numeric;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return 'Obiect greșit.'; end if;
  if length(p::text) > 3000 then return 'Obiect prea mare.'; end if;
  if coalesce(p ->> 't', '') not in ('w', 'a', 'h', 'b', 'j', 'r') then return 'Tip de obiect necunoscut.'; end if;
  if p ? 'lg' and p ->> 'lg' is not null then return 'Legendarele sunt legate de cont și nu se vând.'; end if;
  if jsonb_typeof(p -> 'l') <> 'number' or jsonb_typeof(p -> 'r') <> 'number' then return 'Obiect greșit.'; end if;
  l := (p ->> 'l')::numeric::int;
  if l < 1 or l > least(60, p_lvl + 10) or (p ->> 'l')::numeric <> l then return 'Nivelul obiectului nu e posibil pentru tine.'; end if;
  if (p ->> 'r')::numeric not in (0, 1, 2, 3) then return 'Raritate greșită.'; end if;
  if p ? 'q' and (jsonb_typeof(p -> 'q') <> 'number' or (p ->> 'q')::numeric not between 0 and 4) then return 'Calitate greșită.'; end if;
  if p ? 'up' and p -> 'up' <> 'null'::jsonb and (jsonb_typeof(p -> 'up') <> 'number' or (p ->> 'up')::numeric not between 0 and 9) then return 'Treaptă greșită.'; end if;
  if jsonb_typeof(p -> 'name') <> 'string' or length(p ->> 'name') > 90 then return 'Nume greșit.'; end if;
  if jsonb_typeof(p -> 's') <> 'object' then return 'Obiect fără statistici.'; end if;
  for k, v in select key, value from jsonb_each(p -> 's') loop
    if jsonb_typeof(v) <> 'number' then return 'Statistică greșită: ' || k; end if;
    c := public.bazar_cap(k, l);
    if c < 0 then return 'Statistică necunoscută: ' || k; end if;
    if (v::text)::numeric > c or (v::text)::numeric < -60 then return 'Statistică imposibilă: ' || k; end if;
  end loop;
  return null;
end $$;

create or replace function public.bazar_list(p_item jsonb, p_price bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); w public.wallet%rowtype; cfg jsonb := public.bazar_cfg(); err text; l int; r int; up int; mn bigint; mx bigint; fee bigint; h text; nid bigint;
begin
  if uid is null then raise exception 'Conectează-te.'; end if;
  select * into w from public.wallet where user_id = uid for update;
  if not found then raise exception 'Portofelul nu e încă sincronizat. Încearcă din nou peste câteva secunde.'; end if;
  if w.lvl < (cfg ->> 'min_lvl')::int then raise exception 'Bazarul se deschide la nivelul %.', cfg ->> 'min_lvl'; end if;
  err := public.bazar_valid(p_item, w.lvl); if err is not null then raise exception '%', err; end if;
  if (select count(*) from public.bazar_listings where seller = uid and state = 'open') >= (cfg ->> 'max_open')::int then
    raise exception 'Ai deja % oferte active.', cfg ->> 'max_open'; end if;
  h := md5(p_item::text);
  if exists (select 1 from public.bazar_listings where seller = uid and ihash = h and state = 'open') then raise exception 'Obiectul e deja la vânzare.'; end if;
  l := (p_item ->> 'l')::numeric::int; r := (p_item ->> 'r')::numeric::int; up := coalesce((p_item ->> 'up')::numeric::int, 0);
  mn := public.bazar_shop(l, r); mx := (mn * (cfg ->> 'max_mult')::int * (1 + up / 3.0))::bigint;
  if p_price < mn or p_price > mx then raise exception 'Prețul trebuie să fie între % și % aur.', mn, mx; end if;
  fee := ceil(p_price * (cfg ->> 'fee_list')::numeric);
  if w.gold + w.pend_gold < fee then raise exception 'Taxa de listare e % aur.', fee; end if;
  update public.wallet set pend_gold = pend_gold - fee where user_id = uid;
  insert into public.bazar_listings (seller, item, ihash, price, item_lvl, item_t, item_r, expires_at)
  values (uid, p_item, h, p_price, l, p_item ->> 't', r, now() + make_interval(hours => (cfg ->> 'hours')::int))
  returning id into nid;
  return jsonb_build_object('id', nid, 'fee', fee);
end $$;

create or replace function public.bazar_cancel(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); x public.bazar_listings%rowtype;
begin
  select * into x from public.bazar_listings where id = p_id for update;
  if not found or x.seller <> uid then raise exception 'Oferta nu e a ta.'; end if;
  if x.state <> 'open' then raise exception 'Oferta nu mai e activă.'; end if;
  update public.bazar_listings set state = 'cancelled', closed_at = now() where id = p_id;
  insert into public.bazar_inbox (owner, item, reason) values (uid, x.item, 'retras');
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.bazar_expire() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; x record;
begin
  for x in select * from public.bazar_listings where state = 'open' and expires_at <= now() for update skip locked loop
    update public.bazar_listings set state = 'expired', closed_at = now() where id = x.id;
    insert into public.bazar_inbox (owner, item, reason) values (x.seller, x.item, 'expirat'); n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.bazar_buy(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); x public.bazar_listings%rowtype; wb public.wallet%rowtype; cfg jsonb := public.bazar_cfg(); net bigint;
begin
  if uid is null then raise exception 'Conectează-te.'; end if;
  select * into x from public.bazar_listings where id = p_id for update;
  if not found or x.state <> 'open' or x.expires_at <= now() then raise exception 'Oferta nu mai e disponibilă.'; end if;
  if x.seller = uid then raise exception 'Nu-ți poți cumpăra propria ofertă.'; end if;
  perform 1 from public.wallet where user_id in (uid, x.seller) order by user_id for update;
  select * into wb from public.wallet where user_id = uid;
  if not found then raise exception 'Portofelul nu e încă sincronizat. Încearcă din nou.'; end if;
  if wb.lvl < (cfg ->> 'min_lvl')::int then raise exception 'Bazarul se deschide la nivelul %.', cfg ->> 'min_lvl'; end if;
  if wb.gold + wb.pend_gold < x.price then raise exception 'Îți trebuie % aur.', x.price; end if;
  net := x.price - floor(x.price * (cfg ->> 'fee_sale')::numeric);
  update public.wallet set pend_gold = pend_gold - x.price where user_id = uid;
  update public.wallet set pend_gold = pend_gold + net where user_id = x.seller;
  update public.bazar_listings set state = 'sold', buyer = uid, closed_at = now() where id = p_id;
  insert into public.bazar_inbox (owner, item, reason) values (uid, x.item, 'cumparat');
  return jsonb_build_object('ok', true, 'price', x.price);
end $$;

create or replace function public.bazar_browse(p_t text default null, p_lmin int default 1, p_lmax int default 60, p_r int default null, p_page int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare res jsonb; tot int;
begin
  perform public.bazar_expire();
  select count(*) into tot from public.bazar_listings b where b.state = 'open' and (p_t is null or b.item_t = p_t) and b.item_lvl between p_lmin and p_lmax and (p_r is null or b.item_r = p_r);
  select coalesce(jsonb_agg(row_to_json(q)), '[]'::jsonb) into res from (
    select b.id, b.item, b.price, b.expires_at, b.seller = auth.uid() as mine, coalesce(p.name, 'Jucător') as seller_name
    from public.bazar_listings b left join public.world_players p on p.user_id = b.seller
    where b.state = 'open' and (p_t is null or b.item_t = p_t) and b.item_lvl between p_lmin and p_lmax and (p_r is null or b.item_r = p_r)
    order by b.price asc, b.id asc limit 30 offset greatest(0, p_page) * 30) q;
  return jsonb_build_object('rows', res, 'total', tot, 'cfg', public.bazar_cfg());
end $$;

create or replace function public.bazar_mine() returns jsonb
language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  perform public.bazar_expire();
  select coalesce(jsonb_agg(row_to_json(q)), '[]'::jsonb) into res from (
    select id, item, price, state, created_at, expires_at, closed_at from public.bazar_listings
    where seller = auth.uid() and (state = 'open' or closed_at > now() - interval '7 days') order by created_at desc limit 40) q;
  return jsonb_build_object('rows', res, 'inbox', (select count(*) from public.bazar_inbox where owner = auth.uid() and not claimed));
end $$;

create or replace function public.bazar_claim() returns jsonb
language plpgsql security definer set search_path = public as $$
declare res jsonb;
begin
  with c as (update public.bazar_inbox set claimed = true where owner = auth.uid() and not claimed returning item, reason)
  select coalesce(jsonb_agg(jsonb_build_object('item', item, 'reason', reason)), '[]'::jsonb) into res from c;
  return res;
end $$;

create or replace function public.bazar_admin_cancel(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare x public.bazar_listings%rowtype;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then raise exception 'Doar administratorii.'; end if;
  select * into x from public.bazar_listings where id = p_id for update;
  if not found or x.state <> 'open' then raise exception 'Oferta nu e activă.'; end if;
  update public.bazar_listings set state = 'cancelled', closed_at = now() where id = p_id;
  insert into public.bazar_inbox (owner, item, reason) values (x.seller, x.item, 'retras');
  return jsonb_build_object('ok', true);
end $$;

do $$ declare f text; begin
  foreach f in array array['bazar_list(jsonb,bigint)','bazar_cancel(bigint)','bazar_buy(bigint)','bazar_browse(text,int,int,int,int)','bazar_mine()','bazar_claim()','bazar_expire()','bazar_admin_cancel(bigint)'] loop
    execute 'revoke all on function public.' || f || ' from public';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;

-- ---------------------------------------------------------------- PORTOFELUL, cu aurul din bazar
create or replace function public.wallet_sync(p_gold bigint, p_ore bigint, p_mats jsonb, p_lvl int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  w public.wallet%rowtype;
  h double precision; nl int; lim int; mpl double precision; up int; la timestamptz;
  bg double precision; bo double precision; bm double precision;
  ng bigint; nore bigint; nm jsonb := '{}'::jsonb; k text; v bigint; old bigint; gain bigint; ok bigint;
  v_cut bigint := 0; tot bigint; pg bigint;
begin
  if uid is null then raise exception 'neautificat'; end if;
  p_lvl := greatest(1, least(coalesce(p_lvl, 1), 100));
  p_gold := greatest(0, coalesce(p_gold, 0)); p_ore := greatest(0, coalesce(p_ore, 0));
  if p_mats is null or jsonb_typeof(p_mats) <> 'object' then p_mats := '{}'::jsonb; end if;

  if exists (select 1 from public.admins a where a.user_id = uid) then
    select coalesce(pend_gold, 0) into pg from public.wallet where user_id = uid for update;
    p_gold := greatest(0, p_gold + coalesce(pg, 0));
    insert into public.wallet as x (user_id, gold, ore, mats, lvl, lvl_at, synced_at)
    values (uid, p_gold, p_ore, p_mats, p_lvl, now(), now())
    on conflict (user_id) do update set gold = excluded.gold, ore = excluded.ore, mats = excluded.mats,
      lvl = excluded.lvl, lvl_at = now(), synced_at = now(), pend_gold = 0;
    return jsonb_build_object('gold', p_gold, 'ore', p_ore, 'mats', p_mats, 'lvl', p_lvl, 'cut', false, 'admin', true);
  end if;

  select * into w from public.wallet where user_id = uid for update;
  if found and coalesce(w.pend_gold, 0) <> 0 then
    p_gold := greatest(0, p_gold + w.pend_gold); w.gold := greatest(0, w.gold + w.pend_gold);
    update public.wallet set gold = w.gold, pend_gold = 0 where user_id = uid;
  end if;
  if not found then
    tot := 0;
    for k, v in select key, greatest(0, least((value)::text::numeric, 1e9))::bigint from jsonb_each(p_mats) loop
      if v > 0 then nm := nm || jsonb_build_object(k, v); tot := tot + v; end if;
    end loop;
    lim := 1000 + 100 * p_lvl;
    if tot > lim then
      select coalesce(jsonb_object_agg(key, floor((value)::text::numeric * lim / tot)::bigint), '{}'::jsonb) into nm from jsonb_each(nm);
    end if;
    insert into public.wallet (user_id, gold, ore, mats, lvl, b_gold, b_ore, b_mat)
    values (uid, least(p_gold, 3000 + 4000 * p_lvl), least(p_ore, 500 + 150 * p_lvl), nm, p_lvl,
            public.wallet_rate(p_lvl, 'gold'), public.wallet_rate(p_lvl, 'ore'), public.wallet_rate(p_lvl, 'mat'))
    returning * into w;
    return jsonb_build_object('gold', w.gold, 'ore', w.ore, 'mats', w.mats, 'lvl', w.lvl, 'cut', (w.gold < p_gold or w.ore < p_ore), 'first', true);
  end if;

  h := least(12, greatest(0, extract(epoch from now() - w.synced_at) / 3600.0));
  mpl := case when w.lvl < 10 then 2 when w.lvl < 20 then 6 when w.lvl < 30 then 15 else 30 end;
  up := least(3, floor(extract(epoch from now() - w.lvl_at) / 60.0 / mpl)::int);
  nl := greatest(w.lvl, least(p_lvl, w.lvl + up)); la := case when nl > w.lvl then now() else w.lvl_at end;
  bg := least(w.b_gold + h * public.wallet_rate(nl, 'gold'), 12 * public.wallet_rate(nl, 'gold'));
  bo := least(w.b_ore  + h * public.wallet_rate(nl, 'ore'),  12 * public.wallet_rate(nl, 'ore'));
  bm := least(w.b_mat  + h * public.wallet_rate(nl, 'mat'),  12 * public.wallet_rate(nl, 'mat'));

  if p_gold <= w.gold then ng := p_gold; else gain := p_gold - w.gold; ok := least(gain, floor(bg)::bigint); ng := w.gold + ok; bg := bg - ok; v_cut := v_cut + (gain - ok); end if;
  if p_ore  <= w.ore  then nore := p_ore; else gain := p_ore - w.ore; ok := least(gain, floor(bo)::bigint); nore := w.ore + ok; bo := bo - ok; v_cut := v_cut + (gain - ok); end if;
  for k in select distinct key from (select key from jsonb_each(p_mats) union select key from jsonb_each(w.mats)) q loop
    v := greatest(0, coalesce((p_mats ->> k)::numeric, 0))::bigint; old := coalesce((w.mats ->> k)::numeric, 0)::bigint;
    if v <= old then ok := v; else gain := v - old; ok := old + least(gain, floor(bm)::bigint); bm := bm - least(gain, floor(bm)::bigint); v_cut := v_cut + (v - ok); end if;
    if ok > 0 then nm := nm || jsonb_build_object(k, ok); end if;
  end loop;

  update public.wallet set gold = ng, ore = nore, mats = nm, lvl = nl, b_gold = bg, b_ore = bo, b_mat = bm,
         cut = w.cut + v_cut, lvl_at = la, synced_at = now() where user_id = uid;
  return jsonb_build_object('gold', ng, 'ore', nore, 'mats', nm, 'lvl', nl, 'cut', v_cut > 0);
end $$;

revoke all on function public.wallet_sync(bigint, bigint, jsonb, int) from public;
grant execute on function public.wallet_sync(bigint, bigint, jsonb, int) to authenticated;
