-- ============================================================================
-- Silver Throne — 03-cont.sql
-- Ștergerea contului de către jucător (cerută de Google Play pentru aplicațiile cu conturi).
-- Se rulează O DATĂ în Supabase → SQL Editor, după 02-lume.sql. Se poate rula din nou fără grijă.
--
-- delete_my_account() șterge TOT ce ține de jucătorul conectat: salvarea, profilul și istoricul de la Tron,
-- satul din Lume și atacurile lui, apoi contul însuși (auth.users). Totul se face într-o singură tranzacție:
-- dacă un pas eșuează, nu se șterge nimic și jucătorul vede eroarea.
-- Cine ține Tronul în momentul ștergerii îl lasă gol.
-- ============================================================================

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Conectează-te la cont.'; end if;

  -- Tronul: dacă e rege acum, Tronul rămâne gol
  update public.throne_state set holder = null, since = now() where holder = uid;

  -- provocările altora în care el era regele: păstrăm provocarea, doar fără numele lui (dacă tabela permite)
  begin
    update public.throne_challenges set holder_at_start = null where holder_at_start = uid and user_id <> uid;
  exception when not_null_violation then null;
  end;

  delete from public.throne_challenges where user_id = uid;
  delete from public.throne_reigns     where user_id = uid;
  delete from public.throne_results    where user_id = uid;
  delete from public.throne_profiles   where user_id = uid;

  delete from public.world_raids   where attacker = uid or defender = uid;
  delete from public.world_players where user_id = uid;

  delete from public.game_saves where user_id = uid;

  delete from auth.users where id = uid;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
