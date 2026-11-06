/* Configurare servere Silver Throne.
   Cheile publicabile Supabase sunt publice prin definitie. NU pune aici
   secret keys, service_role, parole sau tokenuri de administrator. */
const ST_BETA_CONFIG = {
  url: '',            // Project URL: https://<project-ref>.supabase.co
  publishableKey: ''   // Cheia publishable (NU secret/service_role)
};
const ST_BETA_READY = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(ST_BETA_CONFIG.url)
  && /^(sb_publishable_|eyJ)/.test(ST_BETA_CONFIG.publishableKey);
const ST_REQUESTED_SERVER = new URLSearchParams(location.search).get('server') === 'beta' ? 'beta' : 'live';
const ST_SERVER = ST_REQUESTED_SERVER === 'beta' && ST_BETA_READY ? 'beta' : 'live';
async function stSwitchServer(next) {
  if (next !== 'live' && next !== 'beta') return;
  if (next === 'beta' && !ST_BETA_READY) return;
  if (next === ST_SERVER) return;
  if (typeof CONT !== 'undefined' && CONT.booted && typeof contPush === 'function') {
    try { await contPush(); } catch (e) { console.warn('Salvarea inainte de schimbarea serverului:', e); }
  }
  const u = new URL(location.href);
  if (next === 'beta') u.searchParams.set('server', 'beta');
  else u.searchParams.delete('server');
  u.hash = '';
  location.assign(u.toString());
}
