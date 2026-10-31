/* ============================================================================
   Silver Throne — cont.js
   Ecranul de conectare, afișat ÎNAINTEA jocului, și legătura dintre cont și salvare.

   Pornire (contStart, apelat la finalul scriptului din index.html):
     sesiune existentă → citește salvarea contului → pornește jocul
     fără sesiune      → ecranul de conectare (Conectare / Cont nou / Am uitat parola)
   Jocul e multiplayer: nu pornește fără cont.
   Fiecare cont are propria copie locală (cheia KEY + ':' + id), deci două conturi pe același
   dispozitiv nu se mai amestecă. În KEY a rămas doar progresul vechi, de dinainte de conturi:
   un cont nou îl poate prelua o singură dată (ecranul „pick”).
   Între copia locală și cea online câștigă cea mai nouă (câmpul S.sv, scris de save()).
   Deconectarea și schimbarea contului reîncarcă pagina: jocul pornește curat, fără date rămase în memorie.

   Folosește din index.html: supabaseClient, KEY, SKEY, boot(src), S. Se încarcă înaintea scriptului din pagină.
   ========================================================================== */
const CONT = { user: null, booted: false, mode: 'in', email: '', busy: false, timer: null, pushing: false, again: false, lastOk: 0, err: '', overGame: false };
/* linkul din emailul de resetare aduce „type=recovery” în adresă; îl citim înainte ca Supabase să curețe adresa */
const CONT_RECOV = typeof location !== 'undefined' && /type=recovery/.test(location.hash);
const CONT_GONE = typeof location !== 'undefined' && /cont-sters/.test(location.hash);
const contHere = () => location.origin + location.pathname;
const cEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cRead = k => { try { const o = JSON.parse(localStorage.getItem(k)); return o && o.fs ? o : null; } catch (e) { return null; } };

/* mesajele Supabase, pe înțelesul jucătorului */
function contErr(e) {
  const m = String((e && e.message) || e || '');
  if (/Invalid login credentials/i.test(m)) return 'Email sau parolă greșită.';
  if (/Email not confirmed/i.test(m)) return 'Contul nu e confirmat încă. Deschide linkul din emailul de confirmare.';
  if (/already registered|already been registered/i.test(m)) return 'Există deja un cont cu acest email. Conectează-te.';
  if (/Password should be at least|password.*(short|length)/i.test(m)) return 'Parola trebuie să aibă cel puțin 6 caractere.';
  if (/same.*password|different from the old/i.test(m)) return 'Parola nouă trebuie să fie diferită de cea veche.';
  if (/rate limit|security purposes|too many/i.test(m)) return 'Prea multe încercări. Așteaptă un minut și încearcă din nou.';
  if (/invalid.*email|email.*invalid|validate email/i.test(m)) return 'Adresa de email nu e validă.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Nu mă pot conecta la server. Verifică internetul și încearcă din nou.';
  return m || 'A apărut o eroare. Încearcă din nou.';
}

/* --------------------------------------------------------------- SALVARE ONLINE */
/* save() din index.html scrie local și apoi cere o salvare online; aici o amânăm 1,2 s ca să grupăm acțiunile rapide */
function contQueue() {
  if (!CONT.user || !CONT.booted) return;
  clearTimeout(CONT.timer); CONT.timer = setTimeout(contPush, 1200);
}
async function contPush() {
  clearTimeout(CONT.timer); CONT.timer = null;
  if (!CONT.user || !S) return true;
  if (CONT.pushing) { CONT.again = true; return false; }
  CONT.pushing = true; let ok = false;
  try {
    const { error } = await supabaseClient.from('game_saves').upsert({ user_id: CONT.user.id, game_data: S, updated_at: new Date().toISOString() });
    if (error) throw error;
    ok = true; CONT.lastOk = Date.now(); CONT.err = '';
  } catch (e) { CONT.err = contErr(e); console.error('Eroare la salvarea online:', e); }
  CONT.pushing = false; contChip();
  if (CONT.again) { CONT.again = false; return contPush(); }
  return ok;
}

/* -------------------------------------------------------------------- PORNIRE */
async function contStart() {
  contMount();
  supabaseClient.auth.onAuthStateChange((ev, session) => {
    /* fără apeluri Supabase direct în acest callback (recomandarea bibliotecii): amânăm cu setTimeout */
    if (ev === 'PASSWORD_RECOVERY') { CONT.recov = true; setTimeout(() => contShow('new'), 0); return; }
    if (!CONT.booted || CONT.recov) return;
    const id = session && session.user ? session.user.id : null;
    if (ev === 'SIGNED_OUT' && CONT.user) location.reload();                       /* deconectat (și din alt tab) */
    else if (id && CONT.user && id !== CONT.user.id) location.reload();             /* alt cont, conectat din alt tab */
  });
  let session = null;
  try { const r = await supabaseClient.auth.getSession(); if (r.error) throw r.error; session = r.data.session; }
  catch (e) { CONT.msg = { t: 'err', m: contErr(e) }; }
  if (session && (CONT_RECOV || CONT.recov)) { CONT.recov = true; CONT.user = session.user; return contShow('new'); }
  if (session) return contEnter(session.user);
  if (CONT_GONE) { CONT.msg = { t: 'ok', m: 'Contul tău și toate datele lui au fost șterse.' }; try { history.replaceState(null, '', contHere()); } catch (e) { /* rămâne în adresă; nu contează */ } }
  contShow('in', true);
}

/* contul e conectat: alege salvarea și pornește jocul */
async function contEnter(user) {
  CONT.user = user; contShow('load');
  const key = KEY + ':' + user.id;
  let r;
  try { r = await supabaseClient.from('game_saves').select('game_data,updated_at').eq('user_id', user.id).maybeSingle(); }
  catch (e) { r = { error: e }; }
  if (r.error) { CONT.msg = { t: 'err', m: 'Nu am putut citi progresul contului. ' + contErr(r.error) }; return contShow('retry'); }
  const cloud = r.data && r.data.game_data && r.data.game_data.fs ? r.data.game_data : null, local = cRead(key);
  if (cloud) {
    const ct = +cloud.sv || Date.parse(r.data.updated_at) || 0;
    /* copia locală e mai nouă doar dacă ultima salvare online nu a mai apucat să plece (tab închis, internet căzut) */
    return contBoot(key, local && +local.sv > ct ? local : cloud);
  }
  if (local) return contBoot(key, local);
  const old = cRead(KEY);                          /* progres vechi, de dinainte de conturi */
  if (old) { CONT.oldSave = old; return contShow('pick'); }
  contBoot(key, null);
}

function contBoot(key, src) {
  SKEY = key;
  try { boot(src); }
  catch (e) { console.error(e); CONT.msg = { t: 'err', m: 'Jocul nu a pornit: ' + ((e && e.message) || e) }; return contShow('retry'); }
  CONT.booted = true; contChip();
  if (typeof hcNeed === 'function' && hcNeed()) { hcStart('new'); contShow('hero'); } else contHide();     /* cont nou: întâi eroul (erou.js) */
  contPush(); try { tronInit(); tronSync(); } catch (e) { /* Tronul se reîncearcă singur */ }
  try { lwSync(); } catch (e) { /* Lumea se reîncearcă singură */ }
}

/* ---------------------------------------------------------------- ECRANUL */
const CONT_CREST = '<svg viewBox="0 0 120 128" aria-hidden="true"><defs>'
  + '<linearGradient id="gSv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7f8"/><stop offset=".45" stop-color="#aeb8be"/><stop offset="1" stop-color="#5d686e"/></linearGradient>'
  + '<linearGradient id="gGd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#f0d27a"/><stop offset="1" stop-color="#a8781c"/></linearGradient></defs>'
  + '<path d="M41 21 L45 3 L53 13 L60 0 L67 13 L75 3 L79 21 Z" fill="url(#gGd)" stroke="#5c430c" stroke-width="2" stroke-linejoin="round"/>'
  + '<path d="M36 50 Q36 26 60 24 Q84 26 84 50 L84 88 L36 88 Z" fill="url(#gSv)" stroke="#2a3134" stroke-width="2.5" stroke-linejoin="round"/>'
  + '<path d="M45 54 Q45 35 60 33 Q75 35 75 54 L75 84 L45 84 Z" fill="#1d2427" stroke="#0b0e10" stroke-width="1.5"/>'
  + '<circle cx="60" cy="49" r="4.5" fill="url(#gGd)" stroke="#5c430c" stroke-width="1.2"/>'
  + '<rect x="24" y="72" width="16" height="16" rx="3" fill="url(#gSv)" stroke="#2a3134" stroke-width="2.5"/><rect x="80" y="72" width="16" height="16" rx="3" fill="url(#gSv)" stroke="#2a3134" stroke-width="2.5"/>'
  + '<rect x="26" y="86" width="68" height="12" rx="2.5" fill="url(#gSv)" stroke="#2a3134" stroke-width="2.5"/>'
  + '<path d="M32 98 L32 122 M88 98 L88 122" stroke="#7c878d" stroke-width="7" stroke-linecap="round"/><path d="M32 98 L32 122 M88 98 L88 122" stroke="#2a3134" stroke-width="1.2" stroke-opacity=".6" fill="none"/>'
  + '</svg>';

function contMount() {
  if (document.getElementById('gate')) return;
  const g = document.createElement('div'); g.id = 'gate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'gate-t');
  g.innerHTML = `<div class="g-col"><div class="g-crest">${CONT_CREST}</div><h1 id="gate-t">Silver Throne</h1><p class="g-tag">Coboară în mină, ridică satul, cucerește Tronul.</p><div class="g-card" id="gate-card"></div><div class="g-foot" id="gate-foot"></div></div>`;
  document.body.appendChild(g); document.documentElement.classList.add('gate-on');
}
function contHide() { const g = document.getElementById('gate'); if (g) g.classList.add('g-out'); setTimeout(() => { if (g && CONT.booted && !CONT.overGame) { g.remove(); } }, 320); document.documentElement.classList.remove('gate-on'); CONT.overGame = false; }

const cField = (id, lab, type, ac, val, extra) => `<label class="g-f" for="${id}"><span>${lab}</span><span class="g-in"><input id="${id}" name="${id}" type="${type}" autocomplete="${ac}" value="${cEsc(val || '')}" required ${extra || ''}>${type === 'password' ? `<button type="button" class="g-eye" onclick="contEye('${id}',this)" aria-label="Arată parola">Arată</button>` : ''}</span></label>`;
function contEye(id, b) { const i = document.getElementById(id); const show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.textContent = show ? 'Ascunde' : 'Arată'; b.setAttribute('aria-label', show ? 'Ascunde parola' : 'Arată parola'); }
const cMsg = () => CONT.msg ? `<p class="g-msg ${CONT.msg.t}" role="${CONT.msg.t === 'err' ? 'alert' : 'status'}">${CONT.msg.m}</p>` : '<p class="g-msg" role="status"></p>';

function contShow(mode, keepMsg) {
  if (!document.getElementById('gate')) contMount();
  if (CONT.booted) { CONT.overGame = true; document.getElementById('gate').classList.remove('g-out'); document.documentElement.classList.add('gate-on'); }
  if (mode !== CONT.mode && !keepMsg && mode !== 'retry' && mode !== 'load') CONT.msg = CONT.msg && CONT.msg.sticky ? CONT.msg : null;
  CONT.mode = mode;
  const card = document.getElementById('gate-card'), foot = document.getElementById('gate-foot');
  const tabs = `<div class="g-tabs" role="tablist"><button type="button" role="tab" aria-selected="${mode === 'in'}" class="${mode === 'in' ? 'on' : ''}" onclick="contShow('in')">Conectare</button><button type="button" role="tab" aria-selected="${mode === 'up'}" class="${mode === 'up' ? 'on' : ''}" onclick="contShow('up')">Cont nou</button></div>`;
  let h = '', f = '';
  if (mode === 'load') h = `<div class="g-load"><span class="g-spin" aria-hidden="true"></span><span>${CONT.user ? 'Se încarcă progresul contului…' : 'Se pregătește jocul…'}</span></div>`;
  else if (mode === 'in') {
    h = tabs + `<form onsubmit="contIn(event)" novalidate>${cField('g-email', 'Email', 'email', 'username email', CONT.email, 'inputmode="email"')}${cField('g-pass', 'Parolă', 'password', 'current-password')}${cMsg()}<button class="g-go" type="submit">Conectează-te</button></form>`
      + `<button type="button" class="g-link" onclick="contShow('reset')">Am uitat parola</button>`;
  } else if (mode === 'up') {
    h = tabs + `<form onsubmit="contUp(event)" novalidate>${cField('g-email', 'Email', 'email', 'username email', CONT.email, 'inputmode="email"')}${cField('g-pass', 'Parolă (cel puțin 6 caractere)', 'password', 'new-password', '', 'minlength="6"')}${cField('g-pass2', 'Repetă parola', 'password', 'new-password', '', 'minlength="6"')}${cMsg()}<button class="g-go" type="submit">Creează contul</button></form>`;
  } else if (mode === 'reset') {
    h = `<h2 class="g-h">Resetează parola</h2><p class="g-p">Îți trimitem pe email un link. Îl deschizi pe acest dispozitiv și alegi o parolă nouă.</p><form onsubmit="contReset(event)" novalidate>${cField('g-email', 'Email', 'email', 'username email', CONT.email, 'inputmode="email"')}${cMsg()}<button class="g-go" type="submit">Trimite linkul</button></form><button type="button" class="g-link" onclick="contShow('in')">Înapoi la conectare</button>`;
  } else if (mode === 'new') {
    h = `<h2 class="g-h">Alege o parolă nouă</h2>${CONT.user ? `<p class="g-p">Pentru contul ${cEsc(CONT.user.email)}.</p>` : ''}<form onsubmit="contNew(event)" novalidate>${cField('g-pass', 'Parola nouă (cel puțin 6 caractere)', 'password', 'new-password', '', 'minlength="6"')}${cField('g-pass2', 'Repetă parola', 'password', 'new-password', '', 'minlength="6"')}${cMsg()}<button class="g-go" type="submit">Salvează parola și intră în joc</button></form>`;
  } else if (mode === 'pick') {
    const g = CONT.oldSave, hero = (g.fs || []).find(x => x && x.h) || g.fs[0] || {};
    h = `<h2 class="g-h">Contul tău e nou</h2><p class="g-p">Pe acest dispozitiv a rămas un progres mai vechi, de dinainte de conturi: <b>${cEsc(hero.n || 'Eroul')}</b>, nivel ${+g.lvl || 1}, ${+g.gold || 0} aur.</p><p class="g-p">Îl poți muta în contul ${cEsc(CONT.user.email)} sau poți începe de la zero. Se poate muta într-un singur cont.</p>`
      + `<div class="g-two"><button class="g-go" type="button" onclick="contPick(1)">Mută progresul în cont</button><button type="button" onclick="contPick(0)">Începe de la zero</button></div>`;
    f = `<button type="button" class="g-link" onclick="contOut()">Folosește alt cont</button>`;
  } else if (mode === 'hero') {
    h = hcCard();
  } else if (mode === 'del') {
    h = `<h2 class="g-h">Ștergi contul?</h2><p class="g-p">Se șterg definitiv contul <b>${cEsc(CONT.user && CONT.user.email)}</b>, tot progresul din joc, satul din Lume, atacurile și istoricul de la Tron. Nu se mai poate recupera.</p>`
      + `<form onsubmit="contDel(event)" novalidate>${cField('g-pass', 'Parola, ca să confirmi că ești tu', 'password', 'current-password')}${cField('g-conf', 'Scrie ȘTERGE', 'text', 'off', '', 'autocapitalize="characters" spellcheck="false"')}${cMsg()}<button class="g-go g-danger" type="submit">Șterge definitiv contul</button></form><button type="button" class="g-link" onclick="contHide()">Renunță</button>`;
  } else if (mode === 'retry') {
    h = `${cMsg()}<div class="g-two"><button class="g-go" type="button" onclick="${CONT.user ? 'contEnter(CONT.user)' : 'location.reload()'}">Încearcă din nou</button>${CONT.user ? '<button type="button" onclick="contOut()">Deconectează-te</button>' : ''}</div>`;
  }
  if (mode === 'in' || mode === 'up' || mode === 'reset') f += '<div class="g-legal"><a href="confidentialitate.html">Confidențialitate</a> · <a href="sterge-cont.html">Ștergerea contului</a></div>';
  card.innerHTML = h; foot.innerHTML = f;
  const first = card.querySelector('input:not([value]), input[value=""]') || card.querySelector('input');
  if (first && window.innerWidth > 700) setTimeout(() => first.focus(), 30);
}

/* ------------------------------------------------------------- ACȚIUNI */
const cVal = id => { const e = document.getElementById(id); return e ? e.value : ''; };
function cBusy(on, label) {
  CONT.busy = on; const b = document.querySelector('#gate-card .g-go');
  if (b) { if (on) { b.dataset.t = b.textContent; b.textContent = label; } else if (b.dataset.t) b.textContent = b.dataset.t; b.disabled = on; }
}
function cSay(t, m) { CONT.msg = { t, m }; const p = document.querySelector('#gate-card .g-msg'); if (p) { p.className = 'g-msg ' + t; p.setAttribute('role', t === 'err' ? 'alert' : 'status'); p.innerHTML = m; } }
function cMail() { const e = cVal('g-email').trim(); CONT.email = e; if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { cSay('err', 'Scrie o adresă de email validă.'); return null; } return e; }

async function contIn(ev) {
  ev.preventDefault(); if (CONT.busy) return;
  const email = cMail(); if (!email) return; const password = cVal('g-pass');
  if (!password) return cSay('err', 'Scrie parola.');
  cBusy(true, 'Se conectează…');
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password }).catch(e => ({ error: e }));
  cBusy(false);
  if (error) {
    const m = contErr(error);
    return cSay('err', /nu e confirmat/.test(m) ? m + ` <button type="button" class="g-link in" onclick="contResend()">Retrimite emailul</button>` : m);
  }
  contEnter(data.user);
}
async function contUp(ev) {
  ev.preventDefault(); if (CONT.busy) return;
  const email = cMail(); if (!email) return; const p1 = cVal('g-pass'), p2 = cVal('g-pass2');
  if (p1.length < 6) return cSay('err', 'Parola trebuie să aibă cel puțin 6 caractere.');
  if (p1 !== p2) return cSay('err', 'Parolele nu coincid.');
  cBusy(true, 'Se creează contul…');
  const { data, error } = await supabaseClient.auth.signUp({ email, password: p1, options: { emailRedirectTo: contHere() } }).catch(e => ({ error: e }));
  cBusy(false);
  if (error) return cSay('err', contErr(error));
  /* Supabase nu spune direct că emailul e deja folosit: întoarce un utilizator fără identități */
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return cSay('err', 'Există deja un cont cu acest email. Conectează-te.');
  if (data.session) return contEnter(data.user);
  CONT.msg = { t: 'ok', m: `Contul e creat. Ți-am trimis un email la <b>${cEsc(email)}</b>: deschide linkul din el, apoi conectează-te aici.`, sticky: 1 };
  contShow('in', true); CONT.msg.sticky = 0;
}
async function contResend() {
  const email = cVal('g-email').trim() || CONT.email; if (!email) return;
  const { error } = await supabaseClient.auth.resend({ type: 'signup', email, options: { emailRedirectTo: contHere() } }).catch(e => ({ error: e }));
  cSay(error ? 'err' : 'ok', error ? contErr(error) : 'Am retrimis emailul de confirmare. Verifică și dosarul Spam.');
}
async function contReset(ev) {
  ev.preventDefault(); if (CONT.busy) return;
  const email = cMail(); if (!email) return;
  cBusy(true, 'Se trimite…');
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: contHere() }).catch(e => ({ error: e }));
  cBusy(false);
  cSay(error ? 'err' : 'ok', error ? contErr(error) : `Dacă există un cont pentru <b>${cEsc(email)}</b>, linkul de resetare e pe drum. Verifică și dosarul Spam.`);
}
async function contNew(ev) {
  ev.preventDefault(); if (CONT.busy) return;
  const p1 = cVal('g-pass'), p2 = cVal('g-pass2');
  if (p1.length < 6) return cSay('err', 'Parola trebuie să aibă cel puțin 6 caractere.');
  if (p1 !== p2) return cSay('err', 'Parolele nu coincid.');
  cBusy(true, 'Se salvează…');
  const { data, error } = await supabaseClient.auth.updateUser({ password: p1 }).catch(e => ({ error: e }));
  cBusy(false);
  if (error) return cSay('err', /session|JWT|expired/i.test(String(error.message)) ? 'Linkul de resetare a expirat. Cere unul nou din „Am uitat parola”.' : contErr(error));
  CONT.recov = false;
  try { history.replaceState(null, '', contHere()); } catch (e) { /* adresa rămâne cu linkul vechi; nu contează */ }
  if (CONT.booted) return location.reload();
  contEnter(data.user || CONT.user);
}
function contPick(move) {
  const g = CONT.oldSave; CONT.oldSave = null;
  contBoot(KEY + ':' + CONT.user.id, move ? g : null);
  if (move && CONT.booted) { try { localStorage.removeItem(KEY); } catch (e) { /* rămâne și local; nu e grav */ } S.msg = 'Progresul de pe acest dispozitiv a fost mutat în contul tău.'; render(); }
}

/* ștergerea contului: reconfirmă parola, apoi delete_my_account() șterge totul pe server (03-cont.sql) */
async function contDel(ev) {
  ev.preventDefault(); if (CONT.busy || !CONT.user) return;
  const pw = cVal('g-pass'), cf = cVal('g-conf').trim().toUpperCase();
  if (!pw) return cSay('err', 'Scrie parola.');
  if (cf !== 'ȘTERGE' && cf !== 'STERGE') return cSay('err', 'Scrie ȘTERGE în al doilea câmp ca să confirmi.');
  cBusy(true, 'Se verifică…');
  const a = await supabaseClient.auth.signInWithPassword({ email: CONT.user.email, password: pw }).catch(e => ({ error: e }));
  if (a.error) { cBusy(false); return cSay('err', /greșită/.test(contErr(a.error)) ? 'Parola nu e corectă.' : contErr(a.error)); }
  cBusy(true, 'Se șterge…');
  clearTimeout(CONT.timer); CONT.timer = null;
  const uid = CONT.user.id, r = await supabaseClient.rpc('delete_my_account').catch(e => ({ error: e }));
  if (r.error) { cBusy(false); return cSay('err', /Could not find the function|schema cache/i.test(String(r.error.message)) ? 'Ștergerea nu e încă pornită pe server (rulează supabase/03-cont.sql).' : 'Contul nu a putut fi șters: ' + contErr(r.error)); }
  CONT.booted = false; CONT.user = null;
  try { localStorage.removeItem(KEY + ':' + uid); } catch (e) { /* ignorat */ }
  await supabaseClient.auth.signOut().catch(() => {});
  try { history.replaceState(null, '', contHere() + '#cont-sters'); } catch (e) { /* mesajul de confirmare nu mai apare; contul e șters oricum */ }
  location.reload();
}

/* deconectare: întâi trimitem ultima salvare, apoi ieșim și repornim pagina */
async function contOut() {
  const b = document.getElementById('acc-out'); if (b) { b.disabled = true; b.textContent = 'Se salvează…'; }
  if (CONT.booted && CONT.user) {
    try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { /* ignorat */ }
    const ok = await contPush();
    if (!ok && !confirm('Ultimele schimbări nu au ajuns online (' + (CONT.err || 'eroare de rețea') + '). Rămân salvate pe acest dispozitiv și se trimit la următoarea conectare de aici. Te deconectezi oricum?')) { if (b) { b.disabled = false; b.textContent = 'Deconectează-te'; } return; }
  }
  CONT.booted = false;                                         /* evenimentul SIGNED_OUT nu mai reîncarcă a doua oară */
  await supabaseClient.auth.signOut().catch(() => {});
  location.reload();
}

/* -------------------------------------------------- BUTONUL „CONT” DIN JOC */
function contChip() {
  if (!CONT.booted) return;
  let t = document.getElementById('auth-toggle'), p = document.getElementById('auth-panel');
  if (!t) {
    t = document.createElement('button'); t.id = 'auth-toggle'; t.type = 'button'; t.setAttribute('aria-expanded', 'false'); t.setAttribute('aria-controls', 'auth-panel');
    p = document.createElement('div'); p.id = 'auth-panel'; p.className = 'auth-hidden';
    t.onclick = () => { const h = p.classList.toggle('auth-hidden'); t.setAttribute('aria-expanded', h ? 'false' : 'true'); if (!h) contChip(); };
    document.addEventListener('click', e => { if (!p.classList.contains('auth-hidden') && !p.contains(e.target) && e.target !== t) { p.classList.add('auth-hidden'); t.setAttribute('aria-expanded', 'false'); } });
    /* bara de sus, dreapta: Clasament + Cont */
    const w = document.createElement('div'); w.id = 'hdr-act';
    const cl = document.createElement('button'); cl.id = 'hdr-cl'; cl.type = 'button'; cl.innerHTML = '<span aria-hidden="true">🏆</span><span class="hdr-l">Clasament</span>'; cl.setAttribute('aria-label', 'Clasament'); cl.title = 'Clasamentul jucătorilor';
    cl.onclick = () => { p.classList.add('auth-hidden'); t.setAttribute('aria-expanded', 'false'); tab('k'); };
    w.append(cl, t); document.body.append(w, p);
  }
  t.innerHTML = '👑 Cont' + (CONT.user && CONT.err ? ' <b class="acc-dot" title="Salvarea online a eșuat">!</b>' : '');
  const st = CONT.err ? `<span class="acc-bad">Salvarea online a eșuat: ${cEsc(CONT.err)} Progresul e păstrat pe acest dispozitiv.</span> <button type="button" onclick="contPush()">Reîncearcă</button>`
    : CONT.pushing || CONT.timer ? 'Se salvează online…' : CONT.lastOk ? 'Progresul e salvat online.' : 'Se pregătește salvarea online…';
  p.innerHTML = `<div class="acc-who">Conectat ca<b>${cEsc(CONT.user.email)}</b></div><p class="acc-st">${st}</p><button type="button" id="acc-out" onclick="contOut()">Deconectează-te</button><div class="acc-legal"><a href="confidentialitate.html" target="_blank" rel="noopener">Confidențialitate</a> · <button type="button" class="acc-del" onclick="contShow('del')">Șterge contul</button></div>`;
}
/* tab ascuns (telefon blocat, altă aplicație): trimitem imediat ce aștepta */
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && CONT.timer) contPush(); });

/* ------------------------------------------------------------------ STILURI */
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
html.gate-on,html.gate-on body{overflow:hidden}
#gate{--sv:#c9d1d6;position:fixed;inset:0;z-index:20000;overflow-y:auto;display:flex;justify-content:center;align-items:flex-start;
  padding:max(24px,env(safe-area-inset-top,0px)) 16px max(24px,env(safe-area-inset-bottom,0px));
  background:radial-gradient(700px 420px at 50% 0,#26302f 0,transparent 70%),radial-gradient(900px 500px at 50% 110%,#2a2212 0,transparent 70%),repeating-linear-gradient(45deg,#0d1113 0 6px,#0b0e10 6px 12px);transition:opacity .3s}
#gate.g-out{opacity:0;pointer-events:none}
.g-col{width:100%;max-width:400px;margin:auto 0;text-align:center}
.g-crest{width:112px;margin:0 auto 6px;filter:drop-shadow(0 6px 10px #000c)}
.g-crest svg{display:block;width:100%;height:auto;animation:gRise 1.4s ease-out both}
@keyframes gRise{0%{opacity:0;transform:translateY(8px);filter:drop-shadow(0 0 0 #f0d27a00)}55%{opacity:1;filter:drop-shadow(0 0 18px #f0d27aaa)}100%{transform:none;filter:drop-shadow(0 0 6px #f0d27a44)}}
#gate h1{font:700 34px/1.1 Cinzel,"Alegreya SC",Georgia,serif;letter-spacing:.06em;margin:0;color:var(--sv);background:linear-gradient(180deg,#fbfcfd 10%,#aab4ba 60%,#717d84);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 0 #000)}
.g-tag{margin:8px 0 22px;color:var(--mute);font-size:17px}
.g-card{text-align:left;background:linear-gradient(180deg,#1b2124,#121719);border:1px solid var(--line);border-top:2px solid var(--gold);border-radius:6px;padding:18px 18px 14px;box-shadow:0 18px 40px #000b,inset 0 1px 0 #ffffff0d}
.g-tabs{display:flex;margin:-4px 0 16px;border-bottom:1px solid var(--line)}
.g-tabs button{flex:1;background:none;border:0;box-shadow:none;border-radius:0;padding:8px 4px 10px;font:700 16px Cinzel,serif;color:var(--mute);border-bottom:2px solid transparent;margin-bottom:-1px}
.g-tabs button.on{color:var(--gold2);border-bottom-color:var(--gold2)}
.g-f{display:block;margin:0 0 12px}.g-f>span:first-child{display:block;font-size:15px;color:var(--ink);margin-bottom:4px}
.g-in{display:flex;align-items:stretch;background:#0b0e10;border:1px solid #5b5236;border-radius:4px}
.g-in:focus-within{border-color:var(--gold2);box-shadow:0 0 0 2px #f0d27a33}
.g-in input{flex:1;min-width:0;border:0;background:none;color:var(--ink);font:17px Alegreya,Georgia,serif;padding:10px 11px;outline:none}
.g-eye{flex:none;background:none!important;border:0!important;box-shadow:none!important;color:var(--mute);font-size:14px;padding:0 11px}
.g-eye:hover{color:var(--gold2)}
.g-go{width:100%;margin-top:4px;padding:11px 14px;font:700 17px Cinzel,serif;letter-spacing:.03em;color:#1a1306!important;background:linear-gradient(180deg,#f7dd8c,#c9a24b 55%,#9b7424)!important;border:1px solid #f0d27a!important;text-shadow:0 1px 0 #fff5}
.g-go:disabled{opacity:.7;cursor:wait}
.g-two{display:flex;flex-direction:column;gap:8px}.g-two button{width:100%;padding:10px}
.g-link{display:block;margin:12px auto 0;background:none!important;border:0!important;box-shadow:none!important;color:var(--gold2);padding:4px;text-decoration:underline;text-underline-offset:3px;font-size:15px}
.g-link.in{display:inline;margin:0;padding:0}
.g-msg{min-height:0;margin:0 0 10px;font-size:15px;line-height:1.4}.g-msg:empty{margin:0}
.g-msg.err{color:#f0a49e}.g-msg.ok{color:#9be0a6}
.g-h{font:700 20px Cinzel,serif;color:var(--gold2);margin:0 0 8px}.g-p{margin:0 0 12px;color:var(--ink);line-height:1.45}
.g-load{display:flex;align-items:center;justify-content:center;gap:12px;padding:18px 0;color:var(--mute)}
.g-spin{width:22px;height:22px;border:3px solid #ffffff22;border-top-color:var(--gold2);border-radius:50%;animation:gSpin .8s linear infinite}
@keyframes gSpin{to{transform:rotate(360deg)}}
.g-danger{background:linear-gradient(180deg,#e0766e,#9c2f29 60%,#6e1f1b)!important;border-color:#f0a49e!important;color:#fff!important;text-shadow:0 1px 1px #000a}
.g-legal{margin-top:14px;font-size:14px;color:var(--mute)}.g-legal a{color:var(--mute);text-underline-offset:3px}
.acc-legal{margin-top:10px;font-size:13px;color:var(--mute);text-align:center}.acc-legal a{color:var(--mute)}
#auth-panel .acc-del{display:inline;width:auto;margin:0;padding:0;background:none;border:0;box-shadow:none;color:#f0a49e;font-size:13px;text-decoration:underline;text-underline-offset:3px}
.g-foot{margin-top:6px}.g-foot small{display:block;color:var(--mute);font-size:14px;max-width:320px;margin:2px auto 0}
#gate button:focus-visible,#gate input:focus-visible{outline:2px solid var(--gold2);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.g-crest svg,.g-spin{animation:none}#gate{transition:none}}
#hdr-act{position:fixed;top:10px;right:10px;z-index:10000;display:flex;gap:6px}
#hdr-act #auth-toggle,#hdr-cl{position:static;padding:6px 12px;font-family:Cinzel,serif;font-weight:700;font-size:13px;color:var(--gold2);background:linear-gradient(180deg,#2a2412,#15110a);border:1px solid var(--gold);border-radius:6px}
#hdr-cl{display:flex;align-items:center;gap:6px}#hdr-cl.on{background:linear-gradient(180deg,#4a3c14,#241c0a);box-shadow:0 0 0 1px var(--gold2),0 0 12px #f0d27a55}
@media (min-width:960px){header{padding-right:240px!important}}
@media (max-width:959px){header{padding-right:132px!important}.hdr-l{display:none}#hdr-cl{padding:6px 10px}}
#auth-toggle{position:fixed;top:10px;right:10px;z-index:10000;padding:6px 12px;font-family:Cinzel,serif;font-weight:700;font-size:13px;color:var(--gold2);background:linear-gradient(180deg,#2a2412,#15110a);border:1px solid var(--gold);border-radius:6px}
.acc-dot{display:inline-block;margin-left:4px;width:16px;height:16px;line-height:16px;border-radius:50%;background:var(--blood);color:#fff;font:700 11px sans-serif;text-align:center}
#auth-panel{position:fixed;top:52px;right:10px;z-index:9999;width:280px;max-width:calc(100vw - 20px);padding:14px;background:linear-gradient(180deg,#1c2225,#12171a);border:1px solid var(--gold);border-radius:8px;box-shadow:0 8px 24px #000c;font:15px Alegreya,Georgia,serif;color:var(--ink)}
#auth-panel button{width:100%;margin-top:6px}
.acc-who{color:var(--mute);font-size:14px}.acc-who b{display:block;color:var(--ink);font-size:16px;overflow-wrap:anywhere}
.acc-st{margin:8px 0 4px;font-size:14px;color:var(--mute)}.acc-bad{color:#f0a49e}
.auth-hidden{display:none!important}
@media (max-width:420px){#gate h1{font-size:28px}.g-crest{width:92px}.g-card{padding:16px 14px 12px}}
`;
  document.head.appendChild(st);
})();
