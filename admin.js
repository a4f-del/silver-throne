/* ============================================================================
   Silver Throne — admin.js
   Panoul de administrator, pentru testare. Apare doar dacă DEV() e adevărat:
     • W.CFG.prod = false (în world-data.js), sau
     • contul conectat e în tabelul public.admins (supabase/06-admin.sql), sau
     • jocul rulează local (localhost / fișier) cu ?dev=1 în adresă.
   Un buton mic 🛠 în colțul din stânga jos deschide panoul. Panoul doar schimbă starea locală (S);
   serverul acceptă valorile mari doar pentru conturile din public.admins (altfel portofelul le taie).
   Se încarcă după cont.js.
   ========================================================================== */
const ADM = { open: false, gen: { t: 'w', wf: 'sab', r: 3, set: 'rand', l: 0, up: 0, n: 1, lg: 'maree' } };

/* ------------------------------------------------------------------ GENERATORUL DE OBIECTE */
const ADM_T = [['w', 'Armă'], ['a', 'Armură'], ['h', 'Coif'], ['b', 'Cizme'], ['j', 'Bijuterie'], ['r', 'Relicvă']];
function admGenSet(k, v) { ADM.gen[k] = ['r', 'l', 'up', 'n'].includes(k) ? +v : v; if (k === 't') admDraw(); }
/* o relicvă ca cele de la căpitani (index.html: relic), la nivelul și calitatea alese */
function admRelic(l, q) {
  const ks = ['pd', 'ph', 'heal', 'pf'].sort(() => Math.random() - 0.5).slice(0, 2), s = {}, v = Math.round((3 + l * 0.18) * (1 + 0.1 * q));
  ks.forEach(k => { s[k] = v; });
  return { t: 'r', l, r: 3, q, name: P(['Ochiul Cenușii', 'Colții Haitei', 'Inima Mlaștinii', 'Cenușa Veche', 'Pecetea Regelui', 'Lacrima Izvorului']), s, m: [] };
}
function admGen(kind) {
  const g = ADM.gen, l = Math.max(1, Math.min(60, g.l || S.lvl)), n = Math.max(1, Math.min(20, g.n || 1)), out = [];
  const up = it => { if (g.up > 0 && it && it.t !== 'r' && typeof upApply === 'function') { it.up = Math.min(9, g.up); upApply(it); } return it; };
  if (kind === 'lgall') { for (const id in LG) out.push(up(mkLegendary(id, l))); }
  else for (let i = 0; i < n; i++) {
    let it;
    if (kind === 'lg') it = mkLegendary(g.lg, l);
    else if (g.t === 'r') it = admRelic(l, Math.max(0, Math.min(4, g.r)));
    else {
      it = mkItem(g.t, l, Math.max(0, Math.min(3, g.r)), null, null, g.r >= 3 ? 2 : 0, g.t === 'w' ? g.wf : undefined);
      if (['a', 'h', 'b', 'j'].includes(g.t) && typeof SETS !== 'undefined') { if (g.set === '') delete it.set; else if (g.set !== 'rand' && SETS[g.set]) it.set = g.set; }
    }
    out.push(up(it));
  }
  const ok = out.filter(Boolean); ok.forEach(it => S.inv.push(it));
  ADM.m = ok.length === 1 ? `${ok[0].name} adăugat în rucsac` : `${ok.length} obiecte adăugate în rucsac`;
  S.msg = ''; go(); admDraw();
}
function admGenHtml() {
  const g = ADM.gen, sel = (k, opts, cur) => `<select onchange="admGenSet('${k}',this.value)" aria-label="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(v) === String(cur) ? ' selected' : ''}>${tEsc(t)}</option>`).join('')}</select>`;
  const rar = [[0, 'Comun'], [1, 'Magic'], [2, 'Rar'], [3, 'Epic']];
  const wfs = typeof WF !== 'undefined' ? Object.entries(WF).map(([k, v]) => [k, `${v.n} · ${v.c === 'Campion' ? 'erou' : v.c}${v.ex ? ' (de clasă)' : ''}`]) : [];
  const sets = [['rand', 'set: la întâmplare'], ['', 'fără set'], ...(typeof SETS !== 'undefined' ? Object.entries(SETS).map(([k, v]) => [k, 'set: ' + v.n]) : [])];
  const lgs = typeof LG !== 'undefined' ? Object.entries(LG).map(([k, v]) => [k, `${v.n}${v.cls ? ' · ' + (v.cls === 'Campion' ? 'erou' : v.cls) : ''}`]) : [];
  return `<div class="adm-g"><span>Obiect</span><div class="adm-bs">${sel('t', ADM_T, g.t)}${g.t === 'w' ? sel('wf', wfs, g.wf) : ''}${g.t === 'r' ? '' : sel('r', rar, g.r)}${['a', 'h', 'b', 'j'].includes(g.t) ? sel('set', sets, g.set) : ''}</div></div>
<div class="adm-g"><span></span><div class="adm-bs"><label class="adm-l">nivel <input type="number" min="1" max="60" value="${g.l || S.lvl}" onchange="admGenSet('l',this.value)"></label><label class="adm-l">Fierărie + <input type="number" min="0" max="9" value="${g.up}" onchange="admGenSet('up',this.value)"></label><label class="adm-l">bucăți <input type="number" min="1" max="20" value="${g.n}" onchange="admGenSet('n',this.value)"></label><button class="p" onclick="admGen('item')">Creează</button></div></div>
<div class="adm-g"><span>Legendar</span><div class="adm-bs">${sel('lg', lgs, g.lg)}<button class="p" onclick="admGen('lg')">Creează</button><button onclick="admGen('lgall')">Toate legendarele</button></div></div>`;
}

/* conturile de administrator cunoscute de joc: panoul apare pentru ele chiar dacă 06-admin.sql nu e rulat încă.
   Fără SQL, generatorul de obiecte merge (obiectele sunt în salvarea ta), dar aurul mare e tăiat de portofel. */
const ADM_EMAILS = ['meleycmetin@gmail.com'];
/* verifică dacă acest cont e administrator: pe server (public.admins) sau după email */
async function admCheck() {
  if (typeof CONT === 'undefined' || !CONT.user || ADM.checking) return;
  ADM.checking = 1;
  const em = String(CONT.user.email || '').toLowerCase();
  let srv = false;
  if (typeof tronRpc === 'function') { const r = await tronRpc('is_admin'); srv = !r.error && r.data === true; ADM.srv = srv; }
  CONT.admin = srv || ADM_EMAILS.includes(em);
  ADM.checked = CONT.user.id; ADM.checking = 0;
  admBtn();
}

function admBtn() {
  if (typeof CONT !== 'undefined' && CONT.user && ADM.checked !== CONT.user.id) admCheck();   /* contul s-a conectat după pornirea paginii */
  let b = document.getElementById('adm-b');
  const on = typeof DEV === 'function' && DEV() && typeof S !== 'undefined' && S && (typeof CONT === 'undefined' || CONT.booted);
  if (!on) { if (b) b.remove(); return; }
  if (b) return;
  b = document.createElement('button');
  b.id = 'adm-b'; b.type = 'button'; b.title = 'Panou de administrator'; b.textContent = '🛠';
  b.onclick = () => { ADM.open = !ADM.open; admDraw(); };
  document.body.appendChild(b);
}

/* acțiunile panoului */
function admDo(k, v) {
  const lvl = n => { S.lvl = Math.max(1, Math.min(typeof LMAX !== 'undefined' ? LMAX : 50, n)); S.xp = 0; S.pts = MXP(); S.ptsT = Date.now(); };
  const mats = n => { for (const x of AFM) give(x, n); for (const r of [1, 2, 3]) for (let q = 0; q < 5; q++) give(RM[r] + q, Math.max(1, Math.round(n / 4))); };
  const all = () => [...S.fs, ...S.rs, ...(S.gd || [])];
  let m = '';
  switch (k) {
    case 'gold': S.gold += v; m = `+${v} aur`; break;
    case 'ore': S.ore += v; m = `+${v} minereu`; break;
    case 'mats': mats(v); m = `+${v} din fiecare material (și cristale)`; break;
    case 'all': S.gold += 100000; S.ore += 10000; mats(1000); S.pts = Math.max(S.pts, MXP()) + 100; m = 'Pachet complet: 100.000 aur, 10.000 minereu, 1.000 materiale, puncte'; break;
    case 'pts': S.pts = Math.max(S.pts, MXP()) + v; S.ptsT = Date.now(); m = `Puncte: ${S.pts}`; break;
    case 'lvl': lvl(S.lvl + v); m = `Nivel ${S.lvl}`; break;
    case 'setlvl': { const n = parseInt(document.getElementById('adm-lv').value, 10); if (!n) return; lvl(n); m = `Nivel ${S.lvl}`; break; }
    case 'heal': all().forEach(f => { f.hp = mhp(f); }); m = 'Toată echipa e vindecată și ridicată'; break;
    case 'scars': all().forEach(f => { f.sc = 0; f.hp = mhp(f); }); m = 'Cicatricile au fost șterse'; break;
    case 'fame': all().filter(f => !f.h && f.c !== 'Gardian').forEach(f => {
      f.fm = (f.fm || 0) + v;
      while ((f.rk || 0) < 4 && typeof SP !== 'undefined' && f.fm >= SP.RKF[(f.rk || 0) + 1]) f.rk = (f.rk || 0) + 1;
    }); m = `+${v} faimă pentru mercenari`; break;
    case 'forge': (S.forge || []).forEach(x => { if (x) x.end = Date.now() - 1; }); m = 'Forja e gata'; break;
    case 'exp': if (S.mx) for (const c in S.mx) S.mx[c].end = Date.now() - 1; m = 'Expedițiile s-au întors'; break;
    case 'daily': if (S.dc && typeof dcYest === 'function') S.dc.day = dcYest(); m = 'Cufărul zilnic se poate deschide din nou'; break;
    case 'lg': S.inv.push(mkLegendary('runic', S.lvl)); m = 'Armă legendară adăugată în rucsac'; break;
    case 'prem': S.prem = !S.prem; m = 'Premium ' + (S.prem ? 'pornit' : 'oprit'); break;
    case 'slots': opt('slots', v); m = `${v} sloturi de forjă`; break;
    case 'tu': opt('tu'); m = 'Ghidul a fost repornit'; break;
    case 'reset': opt('reset'); ADM.m = S.cf && S.cf.k === 'reset' ? 'Apasă din nou în 4 secunde ca să ștergi tot.' : 'Jocul a fost resetat.'; admDraw(); return;
  }
  S.msg = '';
  if (typeof toast === 'function' && m) toast(m);
  go(); ADM.m = m; admDraw();
}

function admDraw() {
  let o = document.getElementById('adm-p');
  if (!ADM.open) { if (o) o.remove(); return; }
  if (!o) { o = document.createElement('div'); o.id = 'adm-p'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'Panou de administrator'); document.body.appendChild(o); }
  const b = (k, v, t, c) => `<button${c ? ` class="${c}"` : ''} onclick="admDo('${k}',${v === undefined ? 'undefined' : JSON.stringify(v)})">${t}</button>`;
  const who = typeof CONT !== 'undefined' && CONT.admin ? (ADM.srv ? 'cont de administrator (serverul acceptă valorile)' : 'administrator după email · rulează 06-admin.sql ca serverul să accepte aurul mare') : (typeof TW !== 'undefined' && !TW.CFG.prod ? 'mod de test (prod: false)' : 'local, ?dev=1');
  o.innerHTML = `<div class="adm-h"><b>🛠 Administrator</b><button class="adm-x" onclick="ADM.open=false;admDraw()" aria-label="Închide">✕</button></div>
<div class="adm-s">${who}${ADM.m ? ` · <span class="adm-ok">${tEsc(ADM.m)}</span>` : ''}</div>
<div class="adm-g"><span>Pachet</span><div class="adm-bs">${b('all', 0, 'Tot din belșug', 'p')}</div></div>
<div class="adm-g"><span>Aur · ${S.gold}</span><div class="adm-bs">${b('gold', 10000, '+10.000')}${b('gold', 100000, '+100.000')}${b('gold', 1000000, '+1.000.000')}</div></div>
<div class="adm-g"><span>Minereu · ${S.ore}</span><div class="adm-bs">${b('ore', 1000, '+1.000')}${b('ore', 10000, '+10.000')}</div></div>
<div class="adm-g"><span>Materiale</span><div class="adm-bs">${b('mats', 100, '+100 din fiecare')}${b('mats', 1000, '+1.000 din fiecare')}</div></div>
<div class="adm-g"><span>Puncte · ${S.pts}</span><div class="adm-bs">${b('pts', 0, 'Umple')}${b('pts', 100, '+100')}</div></div>
<div class="adm-g"><span>Nivel · ${S.lvl}</span><div class="adm-bs">${b('lvl', 1, '+1')}${b('lvl', 5, '+5')}${b('lvl', 10, '+10')}<input id="adm-lv" type="number" min="1" max="50" placeholder="nivel" aria-label="Nivel">${b('setlvl', 0, 'Setează')}</div></div>
<div class="adm-g"><span>Echipă</span><div class="adm-bs">${b('heal', 0, 'Vindecă tot')}${b('scars', 0, 'Șterge cicatricile')}${b('fame', 50, '+50 faimă')}${b('fame', 1000, 'Rang maxim')}</div></div>
<div class="adm-g"><span>Timp</span><div class="adm-bs">${b('forge', 0, 'Termină forja')}${b('exp', 0, 'Termină expedițiile')}${b('daily', 0, 'Cufăr zilnic din nou')}</div></div>
${admGenHtml()}
<div class="adm-g"><span>Premium</span><div class="adm-bs">${b('prem', 0, 'Premium: ' + (S.prem ? 'pornit' : 'oprit'))}</div></div>
<div class="adm-g"><span>Forjă</span><div class="adm-bs">${[4, 6, 8].map(n => b('slots', n, n + ' sloturi', n == S.slots ? 'p' : '')).join('')}</div></div>
<div class="adm-g"><span>Joc</span><div class="adm-bs">${b('tu', 0, 'Repornește ghidul')}${b('reset', 0, 'Resetează jocul', 'd')}</div></div>`;
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `#adm-b{position:fixed;left:12px;bottom:12px;z-index:24000;width:44px;height:44px;min-height:0;padding:0;border-radius:50%;font-size:20px;border:1px solid var(--gold);background:#161b1e;box-shadow:0 4px 14px #000a}
@media (max-width:959px){#adm-b{bottom:84px}}
#adm-p{position:fixed;left:12px;bottom:64px;z-index:24001;width:min(500px,calc(100vw - 24px));max-height:calc(100vh - 140px);overflow-y:auto;padding:12px 14px;border:1px solid var(--gold);border-radius:12px;background:#0d1113f5;box-shadow:0 18px 50px #000e;font-size:14px}
@media (max-width:959px){#adm-p{bottom:136px;max-height:calc(100vh - 200px)}}
.adm-h{display:flex;align-items:center;justify-content:space-between;font:700 15px Cinzel,serif;color:var(--gold2)}
.adm-x{width:auto;min-height:0;padding:2px 9px}
.adm-s{font-size:12px;color:var(--mute);margin:2px 0 8px}.adm-ok{color:#9be0a6}
.adm-g{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-top:1px solid #ffffff14}
.adm-g>span{flex:0 0 112px;font-size:12.5px;color:var(--mute);padding-top:5px}.adm-bs{flex:1;display:flex;flex-wrap:wrap;gap:5px}
.adm-g button{width:auto;min-height:0;padding:4px 9px;font-size:12.5px}
.adm-g select{max-width:100%;padding:4px 6px;font-size:12.5px;border-radius:6px;border:1px solid var(--line);background:#0b0e10;color:var(--ink)}
.adm-l{display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--mute)}.adm-l input{width:56px!important}
.adm-g input{width:70px;padding:4px 6px;font-size:13px;border-radius:6px;border:1px solid var(--line);background:#0b0e10;color:var(--ink)}
@media (max-width:520px){.adm-g{flex-direction:column;gap:4px}.adm-g>span{flex-basis:auto;padding:0}}`;
  document.head.appendChild(st);
  if (typeof window !== 'undefined') { setInterval(admBtn, 1500); setTimeout(admCheck, 2500); }
})();
