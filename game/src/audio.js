// Sound, 100% synthesized with WebAudio: no audio files, no network.
// Every effect is a short oscillator or noise burst shaped by a gain envelope.
// The context is created lazily on the first user gesture so loading the
// title screen never throws or asks for anything.
export function createAudio() {
  return {
    context: null,
    master: null,
    muted: false,
  };
}

function ensureContext(audio) {
  if (audio.context) return audio.context;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audio.context = new Ctor();
    audio.master = audio.context.createGain();
    audio.master.gain.value = 0.35;
    audio.master.connect(audio.context.destination);
  } catch {
    audio.context = null;
  }
  return audio.context;
}

// Call from a user gesture (key or click) so the browser allows sound.
export function unlockAudio(audio) {
  const ctx = ensureContext(audio);
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.35;
  return audio.muted;
}

function tone(audio, { freq, freqEnd, type, seconds, volume, delay = 0 }) {
  const ctx = ensureContext(audio);
  if (!ctx || !audio.master || audio.muted) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), start + seconds);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  osc.connect(gain);
  gain.connect(audio.master);
  osc.start(start);
  osc.stop(start + seconds + 0.05);
}

function noiseBurst(audio, { seconds, volume, lowpass, delay = 0 }) {
  const ctx = ensureContext(audio);
  if (!ctx || !audio.master || audio.muted) return;
  const start = ctx.currentTime + delay;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(audio.master);
  source.start(start);
}

// One entry per event name the world emits. `combo` lifts the collect pitch.
export function playEvent(audio, name, combo = 1) {
  switch (name) {
    case 'collect': {
      const step = Math.min(combo, 12);
      tone(audio, { freq: 520 + step * 42, freqEnd: 780 + step * 42, type: 'sine', seconds: 0.16, volume: 0.5 });
      tone(audio, { freq: 1040 + step * 84, type: 'triangle', seconds: 0.1, volume: 0.18, delay: 0.02 });
      break;
    }
    case 'flare':
      tone(audio, { freq: 180, freqEnd: 720, type: 'sawtooth', seconds: 0.28, volume: 0.28 });
      noiseBurst(audio, { seconds: 0.22, volume: 0.22, lowpass: 2400 });
      break;
    case 'kill':
      tone(audio, { freq: 340, freqEnd: 90, type: 'square', seconds: 0.14, volume: 0.22 });
      break;
    case 'hit':
      tone(audio, { freq: 220, freqEnd: 55, type: 'sawtooth', seconds: 0.4, volume: 0.5 });
      noiseBurst(audio, { seconds: 0.3, volume: 0.3, lowpass: 900 });
      break;
    case 'brazier':
      tone(audio, { freq: 392, type: 'sine', seconds: 0.25, volume: 0.4 });
      tone(audio, { freq: 587, type: 'sine', seconds: 0.3, volume: 0.35, delay: 0.09 });
      tone(audio, { freq: 784, type: 'sine', seconds: 0.4, volume: 0.3, delay: 0.18 });
      break;
    case 'allLit':
      [523, 659, 784, 1047].forEach((freq, i) => {
        tone(audio, { freq, type: 'triangle', seconds: 0.35, volume: 0.32, delay: i * 0.08 });
      });
      break;
    case 'waveClear':
      tone(audio, { freq: 440, type: 'triangle', seconds: 0.2, volume: 0.35 });
      tone(audio, { freq: 660, type: 'triangle', seconds: 0.28, volume: 0.35, delay: 0.1 });
      break;
    case 'waveStart':
      tone(audio, { freq: 330, freqEnd: 440, type: 'triangle', seconds: 0.22, volume: 0.3 });
      break;
    case 'win':
      [523, 659, 784, 1047, 1319].forEach((freq, i) => {
        tone(audio, { freq, type: 'triangle', seconds: 0.5, volume: 0.32, delay: i * 0.12 });
      });
      break;
    case 'lose':
      [392, 330, 262, 196].forEach((freq, i) => {
        tone(audio, { freq, type: 'sine', seconds: 0.55, volume: 0.32, delay: i * 0.16 });
      });
      break;
    default:
      break;
  }
}
