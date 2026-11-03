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
const ADM = { open: false };

/* verifică pe server dacă acest cont e administrator (o dată, după pornirea jocului) */
async function admCheck() {
  if (typeof tronRpc !== 'function' || typeof CONT === 'undefined' || !CONT.user) return;
  const r = await tronRpc('is_admin');
  CONT.admin = !r.error && r.data === true;
  admBtn();
}

function admBtn() {
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
  const who = typeof CONT !== 'undefined' && CONT.admin ? 'cont de administrator (serverul acceptă valorile)' : (typeof TW !== 'undefined' && !TW.CFG.prod ? 'mod de test (prod: false)' : 'local, ?dev=1');
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
<div class="adm-g"><span>Obiecte</span><div class="adm-bs">${b('lg', 0, 'Armă legendară')}${b('prem', 0, 'Premium: ' + (S.prem ? 'pornit' : 'oprit'))}</div></div>
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
.adm-g input{width:70px;padding:4px 6px;font-size:13px;border-radius:6px;border:1px solid var(--line);background:#0b0e10;color:var(--ink)}
@media (max-width:520px){.adm-g{flex-direction:column;gap:4px}.adm-g>span{flex-basis:auto;padding:0}}`;
  document.head.appendChild(st);
  if (typeof window !== 'undefined') { setInterval(admBtn, 1500); setTimeout(admCheck, 2500); }
})();
