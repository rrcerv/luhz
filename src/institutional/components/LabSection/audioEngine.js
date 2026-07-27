/*
 * Miniature synth engine for the lab bench. Everything is synthesized with
 * the Web Audio API — no audio assets. The AudioContext can only start after
 * a user gesture, so every interaction calls unlock() first; hover-triggered
 * sounds stay silent until the first click/tap on the page.
 */

const BPM = 112;
const STEP_DURATION = 60 / BPM / 4; // 16th notes
const STEPS = 16;

const KICK_STEPS = [0, 4, 8, 12];
const HAT_STEPS = [2, 6, 10, 14];
const BASS_NOTES = { 0: 110, 3: 110, 6: 130.81, 8: 110, 11: 98, 14: 164.81 };
const MELODY_NOTES = {
  0: 659.25,
  4: 523.25,
  7: 587.33,
  10: 440,
  12: 783.99,
  14: 587.33,
};

let ctx = null;
let master = null;
let delaySend = null;
let noiseBuffer = null;
let muted = false;

export function unlock() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();

    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);

    // Soft echo used by the melody channel and the plant plucks
    delaySend = ctx.createGain();
    delaySend.gain.value = 0.28;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = STEP_DURATION * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    delaySend.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);

    const length = Math.floor(ctx.sampleRate * 0.3);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
}

function ready() {
  return Boolean(ctx) && ctx.state === 'running';
}

export function setMuted(value) {
  muted = value;
  if (ctx) {
    master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.02);
  }
}

function envelope(time, peak, decay) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
  return gain;
}

function playKick(time) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  const gain = envelope(time, 0.85, 0.28);
  osc.connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + 0.3);
}

function playHat(time) {
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6500;
  const gain = envelope(time, 0.22, 0.06);
  source.connect(filter).connect(gain).connect(master);
  source.start(time);
  source.stop(time + 0.08);
}

function playBass(time, freq) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = freq;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 340;
  const gain = envelope(time, 0.45, 0.22);
  osc.connect(filter).connect(gain).connect(master);
  osc.start(time);
  osc.stop(time + 0.25);
}

function playMelody(time, freq) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  const gain = envelope(time, 0.3, 0.3);
  osc.connect(gain).connect(master);
  gain.connect(delaySend);
  osc.start(time);
  osc.stop(time + 0.32);
}

export function playPluck(freq) {
  unlock();
  if (!ready()) return;
  const time = ctx.currentTime;
  const gain = envelope(time, 0.4, 0.55);
  [freq * 0.998, freq * 1.002].forEach((f) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + 0.6);
  });
  gain.connect(master);
  gain.connect(delaySend);
}

export function playTick() {
  unlock();
  if (!ready()) return;
  const time = ctx.currentTime;
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 2200;
  const gain = envelope(time, 0.25, 0.03);
  source.connect(filter).connect(gain).connect(master);
  source.start(time);
  source.stop(time + 0.04);
}

export function playRing() {
  unlock();
  if (!ready()) return;
  const now = ctx.currentTime;
  [
    { at: now, freq: 880 },
    { at: now + 0.13, freq: 784 },
  ].forEach(({ at, freq }) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = envelope(at, 0.28, 0.18);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + 0.2);
  });
}

/* ------------------------------- Sequencer ------------------------------- */

const activeChannels = { kick: false, hat: false, bass: false, melody: false };
let seqTimer = null;
let nextStep = 0;
let nextTime = 0;

function scheduleAhead() {
  while (nextTime < ctx.currentTime + 0.12) {
    const step = nextStep;
    if (activeChannels.kick && KICK_STEPS.includes(step)) playKick(nextTime);
    if (activeChannels.hat && HAT_STEPS.includes(step)) playHat(nextTime);
    if (activeChannels.bass && step in BASS_NOTES) {
      playBass(nextTime, BASS_NOTES[step]);
    }
    if (activeChannels.melody && step in MELODY_NOTES) {
      playMelody(nextTime, MELODY_NOTES[step]);
    }
    nextTime += STEP_DURATION;
    nextStep = (nextStep + 1) % STEPS;
  }
}

function startSequencer() {
  nextStep = 0;
  nextTime = ctx.currentTime + 0.05;
  seqTimer = setInterval(scheduleAhead, 25);
}

export function stopSequencer() {
  if (seqTimer) {
    clearInterval(seqTimer);
    seqTimer = null;
  }
  Object.keys(activeChannels).forEach((name) => {
    activeChannels[name] = false;
  });
}

export function toggleChannel(name) {
  unlock();
  if (!ctx) return false;
  activeChannels[name] = !activeChannels[name];
  const anyActive = Object.values(activeChannels).some(Boolean);
  if (anyActive && !seqTimer) startSequencer();
  if (!anyActive && seqTimer) {
    clearInterval(seqTimer);
    seqTimer = null;
  }
  return activeChannels[name];
}
