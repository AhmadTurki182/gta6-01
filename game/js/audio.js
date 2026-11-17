/* Procedural WebAudio: engine hum, skids, gunshots, sirens, footsteps and a
   generative Latin-synthwave loop. No audio files, ever. */
export function createAudio() {
  const a = {
    ctx: null, master: null, musicGain: null, engineOsc: null, engineGain: null,
    engineFilter: null, sirenOsc: null, sirenGain: null, started: false,
    musicTimer: null, chordStep: 0, muted: false,
  };
  function ensure() {
    if (a.ctx) return true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      a.ctx = new Ctx();
      a.master = a.ctx.createGain(); a.master.gain.value = 0.5; a.master.connect(a.ctx.destination);
      a.musicGain = a.ctx.createGain(); a.musicGain.gain.value = 0.16; a.musicGain.connect(a.master);
      // Engine: sawtooth through a lowpass, pitch follows speed.
      a.engineOsc = a.ctx.createOscillator(); a.engineOsc.type = 'sawtooth'; a.engineOsc.frequency.value = 60;
      a.engineFilter = a.ctx.createBiquadFilter(); a.engineFilter.type = 'lowpass'; a.engineFilter.frequency.value = 400;
      a.engineGain = a.ctx.createGain(); a.engineGain.gain.value = 0;
      a.engineOsc.connect(a.engineFilter); a.engineFilter.connect(a.engineGain); a.engineGain.connect(a.master);
      a.engineOsc.start();
      // Siren: two-tone triangle.
      a.sirenOsc = a.ctx.createOscillator(); a.sirenOsc.type = 'triangle'; a.sirenOsc.frequency.value = 700;
      a.sirenGain = a.ctx.createGain(); a.sirenGain.gain.value = 0;
      a.sirenOsc.connect(a.sirenGain); a.sirenGain.connect(a.master);
      a.sirenOsc.start();
      a.started = true;
      startMusic(a);
      return true;
    } catch { return false; }
  }
  a.start = () => { if (ensure() && a.ctx.state === 'suspended') a.ctx.resume(); };
  a.setEngine = (speed01, throttle) => {
    if (!a.ctx) return;
    const t = a.ctx.currentTime;
    a.engineOsc.frequency.setTargetAtTime(55 + speed01 * 160 + throttle * 20, t, 0.08);
    a.engineFilter.frequency.setTargetAtTime(300 + speed01 * 1400, t, 0.1);
    a.engineGain.gain.setTargetAtTime(throttle > 0 ? 0.05 + speed01 * 0.06 : 0.015, t, 0.1);
  };
  a.setSiren = (on, dist01) => {
    if (!a.ctx) return;
    const t = a.ctx.currentTime;
    a.sirenGain.gain.setTargetAtTime(on ? 0.05 * (1 - dist01) : 0, t, 0.2);
    if (on) a.sirenOsc.frequency.setTargetAtTime(620 + (Math.floor(t * 2.4) % 2) * 260, t, 0.05);
  };
  function blip(freq, dur, type, vol, when = 0) {
    if (!a.ctx) return;
    const t = a.ctx.currentTime + when;
    const o = a.ctx.createOscillator(), g = a.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseBurst(dur, vol, filterFreq, when = 0) {
    if (!a.ctx) return;
    const t = a.ctx.currentTime + when;
    const len = Math.floor(a.ctx.sampleRate * dur);
    const buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.ctx.createBufferSource(); src.buffer = buf;
    const f = a.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = a.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(a.master); src.start(t);
  }
  a.shot = () => { noiseBurst(0.12, 0.5, 1800); blip(90, 0.14, 'sine', 0.5); };
  a.punch = () => noiseBurst(0.08, 0.35, 900);
  a.crash = () => { noiseBurst(0.3, 0.5, 700); blip(60, 0.25, 'sine', 0.4); };
  a.pickup = () => { blip(660, 0.1, 'sine', 0.3); blip(990, 0.14, 'sine', 0.3, 0.09); };
  a.sirenBurst = () => { blip(700, 0.2, 'triangle', 0.3); blip(950, 0.2, 'triangle', 0.3, 0.2); };
  a.missionComplete = () => { [523, 659, 784, 1046].forEach((f, i) => blip(f, 0.22, 'triangle', 0.3, i * 0.11)); };
  a.step = () => noiseBurst(0.05, 0.08, 500);
  return a;
}
/* Generative loop: Am — F — C — G pads with a montuno-ish bass, 112 BPM. */
function startMusic(a) {
  const chords = [
    [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 220, 246.9],
  ];
  const bass = [55, 43.65, 65.4, 49];
  a.musicTimer = window.setInterval(() => {
    if (!a.ctx || a.ctx.state !== 'running' || a.muted) return;
    const step = a.chordStep++ % 4;
    const t = a.ctx.currentTime;
    for (const f of chords[step]) {
      const o = a.ctx.createOscillator(), g = a.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.4);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.1);
      o.connect(g); g.connect(a.musicGain); o.start(t); o.stop(t + 2.2);
    }
    const b = a.ctx.createOscillator(), bg = a.ctx.createGain();
    b.type = 'sawtooth'; b.frequency.value = bass[step];
    bg.gain.setValueAtTime(0.14, t); bg.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
    b.connect(bg); bg.connect(a.musicGain); b.start(t); b.stop(t + 2);
    // Hat ticks.
    for (let i = 0; i < 4; i++) {
      const len = 2205, buf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < len; j++) d[j] = (Math.random() * 2 - 1) * (1 - j / len) * 0.25;
      const s = a.ctx.createBufferSource(); s.buffer = buf;
      const hp = a.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
      s.connect(hp); hp.connect(a.musicGain); s.start(t + i * 0.53);
    }
  }, 2140);
}
