// Synthesized Sci-Fi HUD sound engine using Web Audio API
// Completely native, lightweight, zero-dependency.

let audioCtx = null;
let humNode = null;
let isSoundEnabled = false;

// Initialize sound state from localStorage
if (typeof window !== 'undefined') {
  isSoundEnabled = localStorage.getItem('cybersim_sound_enabled') === 'true';
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const hudSound = {
  isEnabled() {
    return isSoundEnabled;
  },

  toggle(enable) {
    isSoundEnabled = enable !== undefined ? enable : !isSoundEnabled;
    localStorage.setItem('cybersim_sound_enabled', isSoundEnabled ? 'true' : 'false');
    
    if (isSoundEnabled) {
      this.playBoot();
      this.startAmbientHum();
    } else {
      this.stopAmbientHum();
    }
    return isSoundEnabled;
  },

  // Very short, subtle click for hovers
  playTick() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn("hudSound.playTick error:", e);
    }
  },

  // Standard tactile UI button click
  playClick() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("hudSound.playClick error:", e);
    }
  },

  // Keypress clack
  playType() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 + Math.random() * 300, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch (e) {
      console.warn("hudSound.playType error:", e);
    }
  },

  // High-pitched success indicator
  playSuccess() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.04, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(523.25, now, 0.1); // C5
      playTone(659.25, now + 0.07, 0.1); // E5
      playTone(783.99, now + 0.14, 0.15); // G5
      playTone(1046.50, now + 0.21, 0.25); // C6
    } catch (e) {
      console.warn("hudSound.playSuccess error:", e);
    }
  },

  // Low buzz for errors or gate blocks
  playError() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.25);

      osc.start();
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn("hudSound.playError error:", e);
    }
  },

  // Futuristic boot/chime sequence
  playBoot() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      // Sweep/laser swell
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(80, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.8);
      
      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.05, now + 0.4);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      
      osc1.start();
      osc1.stop(now + 0.8);

      // Digital chime at the top
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, now + 0.65);
      osc2.frequency.setValueAtTime(1600, now + 0.75);

      gain2.gain.setValueAtTime(0.0, now);
      gain2.gain.setValueAtTime(0.03, now + 0.65);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc2.start(now + 0.65);
      osc2.stop(now + 1.2);
    } catch (e) {
      console.warn("hudSound.playBoot error:", e);
    }
  },

  // Low ambient background computer drone hum
  startAmbientHum() {
    if (!isSoundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (humNode) return; // Already humming

      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, ctx.currentTime); // Low A

      // Lowpass filter to make it a warm background rumble
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, ctx.currentTime);
      filter.Q.setValueAtTime(1, ctx.currentTime);

      gain.gain.setValueAtTime(0.012, ctx.currentTime);

      osc.start();
      humNode = { osc, gain };
    } catch (e) {
      console.warn("hudSound.startAmbientHum error:", e);
    }
  },

  stopAmbientHum() {
    if (humNode) {
      try {
        humNode.osc.stop();
        humNode.osc.disconnect();
        humNode.gain.disconnect();
      } catch (e) {}
      humNode = null;
    }
  }
};
