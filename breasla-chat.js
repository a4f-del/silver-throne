/* ============================================================================
   Silver Throne — breasla-chat.js
   Chatul breslei: o filă „Chat” în fereastra Bresle (doar pentru membri).
   Serverul (supabase/42-beta-guild-chat.sql, guild_chat_api) verifică membrul, limitează ritmul
   (1 mesaj / 2 s, 12 / minut) și păstrează ultimele 500 de mesaje. Aici doar afișăm și trimitem.
   Textul primit se afișează întotdeauna escapat (guildEsc), niciodată ca HTML.
   ========================================================================== */
const GCH = { tab: 'info', msgs: [], last: 0, gid: null, loading: false, sending: false, err: '', timer: null, bg: null, fullAt: 0, unread: 0, draft: '' };
const GCH_MAX = 300;
const gchKey = gid => 'st-gchat-seen:' + gid;
function gchSeenGet(gid) { try { return +localStorage.getItem(gchKey(gid)) || 0; } catch (e) { return 0; } }
function gchSeenSet(gid, id) { try { localStorage.setItem(gchKey(gid), String(id)); } catch (e) { /* fără memorie locală: doar insigna nu se păstrează */ } }
const gchMember = () => typeof GUILD !== 'undefined' && !!(GUILD.state && GUILD.state.guild);
const gchOpen = () => !!document.getElementById('guild-overlay') && GCH.tab === 'chat';

async function gchSync(full) {
  if (!gchMember() || GCH.loading || typeof tronRpc !== 'function') return;
  GCH.loading = true;
  const gid = GUILD.state.guild.id;
  if (GCH.gid !== gid) { GCH.gid = gid; GCH.msgs = []; GCH.last = 0; full = true; }
  if (Date.now() - GCH.fullAt > 30000) full = true;          /* o dată la 30 s: listă completă, ca să prindem și ștergerile */
  try {
    const r = await tronRpc('guild_chat_api', { p_action: 'list', p_data: full || !GCH.last ? {} : { after: GCH.last } });
    if (r.error) { GCH.err = /Could not find the function|does not exist|schema cache/i.test(r.error) ? 'Chatul va fi disponibil după instalarea SQL 42 în BETA.' : r.error; return; }
    GCH.err = '';
    gchMerge(r.data, full || !GCH.last);
  } finally { GCH.loading = false; gchPaint(); }
}
function gchMerge(d, full) {
  const list = Array.isArray(d && d.messages) ? d.messages : [];
  if (full) { GCH.msgs = list; GCH.fullAt = Date.now(); }
  else { const seen = new Set(GCH.msgs.map(m => m.id)); GCH.msgs = GCH.msgs.concat(list.filter(m => !seen.has(m.id))).slice(-120); }
  GCH.last = Math.max(GCH.last, +(d && d.last_id) || 0, ...GCH.msgs.map(m => +m.id || 0));
  if (gchOpen()) gchSeenSet(GCH.gid, GCH.last);
  const seen = gchSeenGet(GCH.gid);
  GCH.unread = gchOpen() ? 0 : GCH.msgs.filter(m => m.id > seen && !m.mine && !m.deleted).length;
  gchBadge();
}
async function gchSend() {
  const box = document.getElementById('gch-in');
  const body = (box ? box.value : '').replace(/\s+/g, ' ').trim().slice(0, GCH_MAX);
  if (!body || GCH.sending) return;
  GCH.sending = true; gchPaintForm();
  try {
    const r = await tronRpc('guild_chat_api', { p_action: 'send', p_data: { body, after: GCH.last } });
    if (r.error) { GCH.err = String(r.error).slice(0, 160); return; }
    GCH.err = ''; GCH.draft = '';
    if (box) box.value = '';
    gchMerge(r.data, false);
  } finally { GCH.sending = false; gchPaint(); document.getElementById('gch-in')?.focus(); }
}
async function gchDelete(id) {
  if (!confirmSafe('Ștergi mesajul?')) return;
  const r = await tronRpc('guild_chat_api', { p_action: 'delete', p_data: { id } });
  if (r.error) { GCH.err = String(r.error).slice(0, 160); gchPaint(); return; }
  GCH.err = ''; gchMerge(r.data, true); gchPaint();
}
/* confirmare simplă; dacă browserul blochează dialogul, nu ștergem nimic */
function confirmSafe(t) { try { return window.confirm(t); } catch (e) { return false; } }

function gchTime(ms) {
  const d = new Date(+ms || 0), now = new Date();
  const hm = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === now.toDateString() ? hm : d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) + ' ' + hm;
}
function gchListHtml() {
  if (!GCH.msgs.length) return '<p class="mute gch-empty">' + (GCH.loading ? 'Se încarcă mesajele…' : 'Niciun mesaj încă. Salută-ți breasla!') + '</p>';
  return GCH.msgs.map(m => '<div class="gch-m' + (m.mine ? ' me' : '') + (m.deleted ? ' del' : '') + '">' +
    '<div class="gch-h"><b>' + guildEsc(m.author) + '</b><small>' + gchTime(m.at) + '</small>' +
    (m.can_delete ? '<button type="button" class="gch-x" onclick="gchDelete(' + (+m.id) + ')" aria-label="Șterge mesajul" title="Șterge">✕</button>' : '') + '</div>' +
    '<div class="gch-b">' + (m.deleted ? '<i>mesaj șters</i>' : guildEsc(m.body)) + '</div></div>').join('');
}
function gchHtml() {
  return '<div class="gch"><div id="gch-list" class="gch-list" role="log" aria-live="polite" aria-label="Mesajele breslei">' + gchListHtml() + '</div>' +
    '<p id="gch-err" class="r4 gch-err"' + (GCH.err ? '' : ' hidden') + '>' + guildEsc(GCH.err) + '</p>' +
    '<form class="gch-f" onsubmit="event.preventDefault();gchSend()"><input id="gch-in" type="text" maxlength="' + GCH_MAX + '" placeholder="Scrie breslei…" autocomplete="off" value="' + guildEsc(GCH.draft) + '" oninput="GCH.draft=this.value">' +
    '<button id="gch-go" class="p" type="submit">Trimite</button></form>' +
    '<p class="mute gch-note">Mesajele le văd doar membrii breslei. Conducătorul și ofițerii pot șterge mesaje.</p></div>';
}
/* redesenează doar lista (fără să piardă textul scris sau poziția cursorului) */
function gchPaint() {
  if (!gchOpen()) return;
  const l = document.getElementById('gch-list');
  if (!l) { if (typeof guildPaint === 'function') guildPaint(); return; }
  const atEnd = l.scrollHeight - l.scrollTop - l.clientHeight < 40;
  l.innerHTML = gchListHtml();
  if (atEnd) l.scrollTop = l.scrollHeight;
  const e = document.getElementById('gch-err'); if (e) { e.hidden = !GCH.err; e.textContent = GCH.err; }
  gchPaintForm();
}
function gchPaintForm() { const b = document.getElementById('gch-go'); if (b) { b.disabled = GCH.sending; b.textContent = GCH.sending ? '…' : 'Trimite'; } }
function gchTab(t) {
  GCH.tab = t;
  clearInterval(GCH.timer); GCH.timer = null;
  if (typeof guildPaint === 'function') guildPaint();
  if (t === 'chat') {
    gchSync(true);
    GCH.timer = setInterval(() => { if (gchOpen()) gchSync(false); else { clearInterval(GCH.timer); GCH.timer = null; } }, 6000);
    setTimeout(() => { const l = document.getElementById('gch-list'); if (l) l.scrollTop = l.scrollHeight; document.getElementById('gch-in')?.focus(); }, 0);
  }
}
/* insigna cu mesaje necitite: bara laterală o desenează din GCH.unread; aici doar cerem redesenarea când se schimbă numărul */
let gchBadgeN = 0;
function gchBadge() {
  if (GCH.unread === gchBadgeN) return;
  gchBadgeN = GCH.unread;
  if (typeof hdr === 'function' && typeof S !== 'undefined' && S) { try { hdr(); } catch (e) { /* bara se redesenează la următorul go() */ } }
}

/* fila Chat se adaugă peste fereastra existentă a breslei, fără să schimbăm conținutul ei */
(function () {
  if (typeof window === 'undefined' || typeof guildPaint !== 'function') return;
  const base = guildPaint;
  window.guildPaint = function () {
    const host = document.getElementById('guild-view');
    if (!host || !gchMember()) { if (GCH.tab !== 'info') GCH.tab = 'info'; return base(); }
    const tabs = '<div class="tm-tabs gch-tabs" role="tablist"><button role="tab" aria-selected="' + (GCH.tab === 'info') + '" class="' + (GCH.tab === 'info' ? 'on' : '') + '" onclick="gchTab(\'info\')">Breasla</button>' +
      '<button role="tab" aria-selected="' + (GCH.tab === 'chat') + '" class="' + (GCH.tab === 'chat' ? 'on' : '') + '" onclick="gchTab(\'chat\')">💬 Chat' + (GCH.unread && GCH.tab !== 'chat' ? ' <b class="gch-badge">' + GCH.unread + '</b>' : '') + '</button></div>';
    if (GCH.tab === 'chat' && document.getElementById('gch-list')) return gchPaint();   /* deja deschis: nu pierdem textul scris sau focusul */
    if (GCH.tab === 'chat') { host.innerHTML = tabs + gchHtml(); const l = document.getElementById('gch-list'); if (l) l.scrollTop = l.scrollHeight; return; }
    base(); host.insertAdjacentHTML('afterbegin', tabs);
  };
  /* verificare discretă, o dată pe minut, ca să apară insigna de mesaje noi */
  GCH.bg = setInterval(() => { if (gchMember() && !gchOpen() && !document.hidden) gchSync(false); }, 60000);
  setTimeout(() => { if (gchMember()) gchSync(true); }, 8000);
})();

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.gch-tabs{margin:0 0 12px}
.gch{display:flex;flex-direction:column;gap:8px}
.gch-list{height:min(52vh,460px);overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid var(--line);border-radius:10px;background:#0b0e10;scrollbar-width:thin;scrollbar-color:#5a4a22 transparent}
.gch-empty{margin:auto;text-align:center}
.gch-m{max-width:82%;align-self:flex-start;padding:6px 10px 7px;border:1px solid #ffffff14;border-radius:10px 10px 10px 3px;background:#151b1e}
.gch-m.me{align-self:flex-end;border-radius:10px 10px 3px 10px;background:#2a2312;border-color:#f0d27a33}
.gch-m.del .gch-b{color:var(--mute)}
.gch-h{display:flex;align-items:baseline;gap:8px}.gch-h b{font:700 13px Cinzel,serif;color:var(--gold2,#f0d27a)}.gch-h small{font-size:11px;color:var(--mute)}
.gch-x{margin-left:auto;width:auto;min-height:0;padding:0 5px;font-size:11px;line-height:1.4;background:transparent;border:0;box-shadow:none;color:var(--mute);opacity:.6}
.gch-x:hover{opacity:1;color:#e8837b;transform:none}
.gch-b{font-size:14.5px;line-height:1.35;overflow-wrap:anywhere;white-space:pre-wrap}
.gch-f{display:flex;gap:6px}.gch-f input{flex:1;min-width:0;padding:9px 11px;border-radius:8px;border:1px solid var(--line);background:#0b0e10;color:var(--ink);font-size:15px}
.gch-f button{width:auto;flex:none;padding:8px 16px}
.gch-err{margin:0;font-size:13px}.gch-note{margin:0;font-size:12px}
.gch-badge{display:inline-block;min-width:18px;margin-left:6px;padding:0 5px;border-radius:9px;background:#c0504a;color:#fff;font:700 11px/18px Alegreya,Georgia,serif;text-align:center}
@media (max-width:520px){.gch-list{height:52vh}.gch-m{max-width:92%}}`;
  document.head.appendChild(st);
})();
