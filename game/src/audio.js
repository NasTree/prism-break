// Synthesised sound only: every effect is an oscillator or filtered noise burst
// built by the Web Audio API, so the game ships no audio files and makes no
// network request. The context is created on the first user gesture.
export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicOn = false;
  let musicTimer = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.08;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, freq, when = 0) {
    if (!context || muted) return;
    const t0 = context.currentTime + when;
    const len = Math.max(1, Math.floor(context.sampleRate * dur));
    const buffer = context.createBuffer(1, len, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = context.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(t0);
  }

  /** A slow two-note pad that drifts under the game; quiet, and off until started. */
  function startMusic() {
    if (!context || musicOn || muted) return;
    musicOn = true;
    const roots = [110, 130.81, 98, 146.83];
    let index = 0;
    function chord() {
      if (!musicOn) return;
      const root = roots[index % roots.length];
      index += 1;
      const t0 = context.currentTime;
      for (const [mult, vol] of [[1, 0.5], [1.5, 0.32], [2, 0.18]]) {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.value = root * mult;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 1.2);
        gain.gain.linearRampToValueAtTime(0, t0 + 3.6);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(t0);
        osc.stop(t0 + 3.8);
      }
      musicTimer = window.setTimeout(chord, 3400);
    }
    chord();
  }

  return {
    /** Call from a user gesture: unlocks audio and starts the pad. */
    unlock() {
      if (!ensure()) return;
      if (context.state === 'suspended') context.resume().catch(() => {});
      startMusic();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      if (muted && musicTimer !== null) {
        window.clearTimeout(musicTimer);
        musicTimer = null;
        musicOn = false;
      } else if (!muted && context) {
        startMusic();
      }
      return muted;
    },
    isMuted() {
      return muted;
    },
    paddle() {
      tone(220, 0.07, 'triangle', 0.25, 0, 330);
    },
    wall() {
      tone(180, 0.05, 'square', 0.1);
    },
    /** Pitch rises with the row, so breaking higher bricks sounds brighter. */
    brick(row) {
      const base = 420 + row * 55;
      tone(base, 0.09, 'sine', 0.3);
      tone(base * 2, 0.06, 'sine', 0.12);
      noise(0.05, 0.12, 2400);
    },
    sealed() {
      tone(140, 0.12, 'square', 0.16, 0, 110);
    },
    prism() {
      tone(660, 0.1, 'sine', 0.22);
      tone(880, 0.1, 'sine', 0.18, 0.06);
      tone(1320, 0.14, 'sine', 0.14, 0.12);
    },
    powerup() {
      tone(523, 0.09, 'triangle', 0.25);
      tone(659, 0.09, 'triangle', 0.25, 0.08);
      tone(784, 0.14, 'triangle', 0.25, 0.16);
    },
    laser() {
      tone(980, 0.08, 'square', 0.12, 0, 240);
      noise(0.04, 0.08, 3200);
    },
    lose() {
      tone(392, 0.18, 'sawtooth', 0.16, 0, 330);
      tone(311, 0.18, 'sawtooth', 0.16, 0.16, 262);
      tone(233, 0.3, 'sawtooth', 0.16, 0.32, 175);
    },
    levelClear() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => tone(freq, 0.16, 'triangle', 0.25, i * 0.09));
    },
    victory() {
      const notes = [523, 659, 784, 1047, 1319, 1568];
      notes.forEach((freq, i) => tone(freq, 0.22, 'triangle', 0.25, i * 0.11));
      tone(262, 0.9, 'sine', 0.15, 0.1);
    },
  };
}
