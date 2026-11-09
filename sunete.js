/* ============================================================================
   Silver Throne — sunete.js
   Sunetele luptei, generate direct în browser (Web Audio), fără fișiere audio:
   lovitură, critic, vindecare, căzut, victorie, înfrângere. Se pot opri din Setări › Luptă
   (S.sfxOff). Pornesc doar după o atingere/clic al jucătorului (regula browserelor).
   Volumul e mic din start; nu se aud când redarea luptei e sărită sau la „mișcare redusă” nu contează (sunetul nu e mișcare).
   ========================================================================== */
const SFX = { ctx: null, master: null, last: 0 };
const sfxOn = () => typeof S !== 'undefined' && S && !S.sfxOff;
function sfxCtx() {
  if (!sfxOn()) return null;
  try {
    if (!SFX.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      SFX.ctx = new AC(); SFX.master = SFX.ctx.createGain(); SFX.master.gain.value = 0.22; SFX.master.connect(SFX.ctx.destination);
    }
    if (SFX.ctx.state === 'suspended') SFX.ctx.resume();
    return SFX.ctx;
  } catch (e) { return null; }
}
function sfxNoise(c, dur) {
  const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(); s.buffer = b; return s;
}
function sfxTone(c, t, f0, f1, dur, type, vol) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(SFX.master); o.start(t); o.stop(t + dur + 0.02);
}
const SFX_KIND = {
  hit(c, t) {   /* bufnitură + zgomot scurt filtrat: lama în armură */
    const n = sfxNoise(c, 0.12), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 600; f.Q.value = 0.9;
    g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    n.connect(f); f.connect(g); g.connect(SFX.master); n.start(t);
    sfxTone(c, t, 150, 60, 0.12, 'sine', 0.6);
  },
  crit(c, t) {  /* lovitură grea + inel metalic */
    SFX_KIND.hit(c, t);
    sfxTone(c, t + 0.01, 90, 40, 0.25, 'sine', 0.8);
    sfxTone(c, t + 0.02, 1320, 1250, 0.45, 'triangle', 0.18); sfxTone(c, t + 0.02, 1980, 1900, 0.35, 'sine', 0.1);
  },
  heal(c, t) { [784, 988, 1175].forEach((f, i) => sfxTone(c, t + i * 0.07, f, 0, 0.35, 'sine', 0.18)); },
  down(c, t) { sfxTone(c, t, 220, 70, 0.5, 'sawtooth', 0.12); sfxTone(c, t, 110, 45, 0.6, 'sine', 0.4); },
  win(c, t) { [523, 659, 784, 1047].forEach((f, i) => { sfxTone(c, t + i * 0.11, f, 0, 0.5, 'triangle', 0.3); sfxTone(c, t + i * 0.11, f * 2, 0, 0.3, 'sine', 0.08); }); },
  lose(c, t) { [392, 349, 311, 262].forEach((f, i) => sfxTone(c, t + i * 0.16, f, f * 0.97, 0.45, 'triangle', 0.25)); }
};
function sfxPlay(kind) {
  const c = sfxCtx(); if (!c || !SFX_KIND[kind]) return;
  const now = c.currentTime;
  if ((kind === 'hit' || kind === 'crit') && now - SFX.last < 0.06) return;   /* nu suprapunem zeci de lovituri la 4× */
  if (kind === 'hit' || kind === 'crit') SFX.last = now;
  try { SFX_KIND[kind](c, now + 0.01); } catch (e) { /* sunetul nu oprește niciodată jocul */ }
}
function sfxToggle() { S.sfxOff = !S.sfxOff; if (!S.sfxOff) sfxPlay('heal'); if (typeof go === 'function') go(); }

/* se leagă de efectele luptei (fx-plus.js), fără să le schimbe */
(function () {
  if (typeof window === 'undefined') return;
  const wrap = (name, fn) => { const base = window[name]; if (typeof base !== 'function') return; window[name] = function () { const r = base.apply(this, arguments); try { fn.apply(this, arguments); } catch (e) { /* doar sunet */ } return r; }; };
  wrap('fxPlusFrame', (m, fr, info) => {
    const dmg = [...(fr.fs || []), ...(fr.es || [])].filter(d => d.v < 0), heal = [...(fr.fs || []), ...(fr.es || [])].filter(d => d.v > 0);
    if (dmg.length) sfxPlay(info && info.crit ? 'crit' : 'hit');
    else if (heal.length) sfxPlay('heal');
    if (info && info.hp && dmg.some(d => (info.hp.fs[d.i] <= 0 && (fr.fs || []).includes(d)) || (info.hp.es[d.i] <= 0 && (fr.es || []).includes(d)))) setTimeout(() => sfxPlay('down'), 120);
  });
  wrap('fxPlusEnd', (m, cast, hp) => {
    if (!hp) return;
    const esDown = hp.es.every(v => v <= 0), fsDown = hp.fs.every(v => v <= 0);
    if (esDown && !fsDown) sfxPlay('win'); else if (fsDown) sfxPlay('lose');
  });
})();
