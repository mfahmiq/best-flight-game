// audio.js — every sound is synthesised with WebAudio. No audio files.
// One job: engine drone, wind, and one-shot cues (ring, touchdown, crash,
// success). Starts only after a user gesture, as browsers require.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.windSrc = null;
    this.windGain = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // Engine: two detuned saws through a low-pass, pitch follows throttle.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 70;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 71.5;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter); osc2.connect(filter);
    filter.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start(); osc2.start();
    this.engineOsc2 = osc2;
    // Wind: looped filtered noise, loudness follows airspeed.
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.windSrc = this.ctx.createBufferSource();
    this.windSrc.buffer = buf; this.windSrc.loop = true;
    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.6;
    this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0;
    this.windSrc.connect(windFilter); windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windSrc.start();
  }

  // Called every frame while flying: throttle 0..1, speed m/s, airborne bool.
  update(throttle, speed, airborne) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const rpm = 55 + throttle * 75 + speed * 0.25;
    this.engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(rpm * 1.014, t, 0.08);
    this.engineGain.gain.setTargetAtTime(airborne ? 0.045 + throttle * 0.05 : 0.02 + throttle * 0.03, t, 0.1);
    this.windGain.gain.setTargetAtTime(Math.min(0.09, speed * 0.0011), t, 0.15);
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  ring() { this.blip(880, 0.18, 'sine', 0.16); this.blip(1318, 0.3, 'sine', 0.14, 0.07); }
  touchdown() { this.blip(140, 0.22, 'triangle', 0.22); this.blip(90, 0.3, 'sine', 0.18, 0.03); }
  bounce() { this.blip(180, 0.15, 'square', 0.1); }
  crash() {
    this.blip(70, 0.7, 'sawtooth', 0.25);
    this.blip(48, 0.9, 'square', 0.2, 0.08);
    this.blip(220, 0.4, 'triangle', 0.12, 0.05);
  }
  stallWarn() { this.blip(620, 0.12, 'square', 0.07); }
  success() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.35, 'sine', 0.14, i * 0.12));
  }
  click() { this.blip(700, 0.06, 'sine', 0.08); }
}
