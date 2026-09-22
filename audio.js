/* Sound: everything is synthesised with the Web Audio API, so there are no audio files to load.
   - a bed of sea and wind noise that follows the boat's speed
   - quiet generative music: slow pads in D major with a sparse plucked melody
   - small effects for docking, gates, goals, cards, bumps, gulls
   Browsers only allow audio after a user gesture, so start() is called on the first key press / touch. */

let ctx = null, master, music, send, windGain, rushGain, noiseBuf, timer = null, lastThud = 0;
let muted = false; try { muted = localStorage.getItem('sail.muted') === '1'; } catch {}

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const CHORDS = [[38, 50, 57, 62, 66, 69], [35, 47, 54, 62, 66, 69], [31, 43, 50, 59, 62, 66], [33, 45, 52, 57, 61, 64]];   // D, Bm, G, A
const SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81];                                                                        // D major pentatonic
const BAR = 8; let nextBar = 0, nextNote = 0, bar = 0, step = 4;

function noiseSource(filterType, freq, q, gainValue) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = gainValue; src.connect(f).connect(g).connect(master); src.start(); return g;
}
function tone(freq, dur, { type = 'sine', vol = .1, at = 0, to = null, out = null, attack = .008 } = {}) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(out || master); if (!out) g.connect(send); o.start(t); o.stop(t + dur + .05);
}
function burst(freq, dur, vol, at = 0) {   // a short splash of filtered noise
  const t = ctx.currentTime + at, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = noiseBuf; src.loop = true;
  f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * .4, t + dur); f.Q.value = .8;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); src.connect(f).connect(g).connect(master); src.start(t, Math.random()); src.stop(t + dur + .05);
}
function pad(midi, t) {   // one soft, slow note of the background chord
  for (const [type, det, vol] of [['sine', 0, .02], ['triangle', 5, .009]]) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = hz(midi); o.detune.value = det;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 2.5); g.gain.setValueAtTime(vol, t + BAR - 1.5); g.gain.linearRampToValueAtTime(0, t + BAR + 2.5);
    o.connect(g).connect(music); o.start(t); o.stop(t + BAR + 2.6); }
}
function schedule() {
  const now = ctx.currentTime;
  while (nextBar < now + 1) { for (const n of CHORDS[bar % CHORDS.length]) pad(n, nextBar); bar++; nextBar += BAR; }
  while (nextNote < now + 1) {
    if (Math.random() < .34) { step = Math.max(0, Math.min(SCALE.length - 1, step + Math.round((Math.random() - .5) * 4)));
      const t = nextNote - now; tone(hz(SCALE[step]), 1.6, { type: 'triangle', vol: .035, at: Math.max(0, t), out: music, attack: .01 }); tone(hz(SCALE[step]), 1.6, { type: 'sine', vol: .02, at: Math.max(0, t), out: send }); }
    nextNote += .5;
  }
}

export const audio = {
  get muted() { return muted; },
  start() {
    if (ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { ctx = new AC(); } catch { return; }
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 1; const comp = ctx.createDynamicsCompressor(); master.connect(comp).connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = .9; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; music.connect(lp).connect(master);
    send = ctx.createGain(); send.gain.value = .5; const delay = ctx.createDelay(1), fb = ctx.createGain(), dl = ctx.createBiquadFilter(); delay.delayTime.value = .42; fb.gain.value = .38; dl.type = 'lowpass'; dl.frequency.value = 1500;
    send.connect(delay); delay.connect(dl).connect(fb).connect(delay); dl.connect(master); lp.connect(send);
    const sea = noiseSource('lowpass', 420, .3, .05), lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = .11; lg.gain.value = .03; lfo.connect(lg).connect(sea.gain); lfo.start();   // slow swell
    windGain = noiseSource('bandpass', 700, .5, .01); rushGain = noiseSource('highpass', 2500, .3, 0);
    nextBar = ctx.currentTime + .3; nextNote = ctx.currentTime + 2; timer = setInterval(schedule, 250); schedule();
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
  },
  frame(speed01) { if (!ctx) return; const t = ctx.currentTime; windGain.gain.setTargetAtTime(.01 + speed01 * .05, t, .6); rushGain.gain.setTargetAtTime(speed01 * speed01 * .035, t, .4); },
  toggle() { muted = !muted; try { localStorage.setItem('sail.muted', muted ? '1' : '0'); } catch {} if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, .08); return muted; },
  play(name, v = 1) {
    if (!ctx || muted) return;
    switch (name) {
      case 'dock': tone(523, .6, { vol: .1 }); tone(784, .9, { vol: .09, at: .13 }); break;
      case 'castoff': tone(392, .4, { vol: .08 }); tone(294, .7, { vol: .08, at: .11 }); break;
      case 'gate': tone(880, .3, { type: 'triangle', vol: .1 }); break;
      case 'start': tone(660, .16, { type: 'triangle', vol: .1 }); tone(880, .4, { type: 'triangle', vol: .1, at: .16 }); break;
      case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => tone(f, .5, { type: 'triangle', vol: .1, at: i * .1 })); break;
      case 'chime': tone(1047, .5, { vol: .08 }); tone(1319, .8, { vol: .07, at: .09 }); break;
      case 'ding': tone(1320, .35, { vol: .09 }); break;
      case 'ding2': tone(1320, .3, { vol: .09 }); tone(1760, .6, { vol: .09, at: .08 }); break;
      case 'pop': tone(240, .16, { vol: .22, to: 80 }); burst(1800, .12, .08); break;
      case 'thud': { const now = ctx.currentTime; if (now - lastThud < .12) return; lastThud = now; tone(120, .28, { vol: .25 * v, to: 48 }); burst(1300, .35, .07 * v); break; }
      case 'splash': burst(1500, .4, .06 * v); break;
      case 'gull': for (let i = 0; i < 3; i++) tone(1500 + Math.random() * 200, .22, { type: 'triangle', vol: .025, to: 950, at: i * .3 + Math.random() * .05 }); break;
    }
  },
};
