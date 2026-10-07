/**
 * JVāN HAUTE ATELIER AUDIO ENGINE
 * Studio-Grade Procedural Web Audio Synthesis
 * 
 * Features:
 * - Master Dynamics Compressor & Algorithmic Convolution Reverb (Velvet Atelier Room)
 * - Tactile Luxury UI Haptics: Micro-tick hover, weighted switch click, silk whoosh modals
 * - Generative Haute Couture Ambient Soundscape: Dmaj9 analog pad with slow filter breath
 * - In-Game Pixel RPG Sound FX: Marble runway footsteps, crystal swatch pickup, hydraulic vault unlock, cinematic hazard pulse, runway fanfare
 * - Zero external assets / 100% reliable procedural Web Audio
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.convolver = null;
    this.reverbGain = null;

    // Audio modes: 'all' (Ambient + SFX), 'sfx' (SFX only), 'muted' (Silence)
    const savedMode = localStorage.getItem('jvan_audio_mode');
    const legacyMuted = localStorage.getItem('jvan_audio_muted') === 'true';
    
    if (savedMode) {
      this.mode = savedMode;
    } else if (legacyMuted) {
      this.mode = 'muted';
    } else {
      this.mode = 'all'; // Default to full luxury soundscape
    }

    this.isMuted = this.mode === 'muted';

    // Ambient synthesizer state
    this.ambientGain = null;
    this.ambientNodes = [];
    this.isAmbientPlaying = false;

    // Rate-limiting for high-frequency interactions (hover, footsteps)
    this.lastHoverTime = 0;
    this.lastFootstepTime = 0;
    this.footstepStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // 1. Master Compressor (Analog Warmth & Anti-Clipping)
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(20, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(5, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      // 2. Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // 3. Algorithmic Atelier Reverb (Intimate high-end velvet/marble room)
      try {
        this.convolver = this.ctx.createConvolver();
        this.convolver.buffer = this.buildReverbImpulse(1.4, 3.2);

        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
        this.convolver.connect(this.reverbGain);
        this.reverbGain.connect(this.masterGain);
      } catch (err) {
        console.warn('Reverb initialization fallback:', err);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Auto-start ambient pad if mode is 'all'
    if (this.mode === 'all' && !this.isAmbientPlaying) {
      this.startAmbient();
    }
  }

  // Generate a procedural stereo convolution impulse response for lush studio acoustics
  buildReverbImpulse(durationSec = 1.4, decaySpeed = 3.0) {
    if (!this.ctx) return null;
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * durationSec);
    const buffer = this.ctx.createBuffer(2, length, rate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const envelope = Math.exp(-t * decaySpeed);
      // Soft low-pass filtered noise simulation
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return buffer;
  }

  // Set specific audio mode: 'all' | 'sfx' | 'muted'
  setAudioMode(newMode) {
    this.mode = newMode;
    this.isMuted = newMode === 'muted';
    localStorage.setItem('jvan_audio_mode', newMode);
    localStorage.setItem('jvan_audio_muted', this.isMuted.toString());

    this.init();

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      if (this.isMuted) {
        this.masterGain.gain.linearRampToValueAtTime(0, now + 0.15);
        this.stopAmbient();
      } else {
        this.masterGain.gain.linearRampToValueAtTime(0.85, now + 0.15);
        if (newMode === 'all') {
          this.startAmbient();
        } else {
          this.stopAmbient();
        }
      }
    }

    return this.mode;
  }

  // Cycle through modes: 'all' -> 'sfx' -> 'muted' -> 'all'
  cycleAudioMode() {
    let next;
    if (this.mode === 'all') next = 'sfx';
    else if (this.mode === 'sfx') next = 'muted';
    else next = 'all';

    return this.setAudioMode(next);
  }

  // Binary toggle for backward compatibility
  toggleMute() {
    if (this.isMuted) {
      this.setAudioMode('all');
    } else {
      this.setAudioMode('muted');
    }
    return this.isMuted;
  }

  /* ==========================================================================
     HAUTE COUTURE AMBIENT SOUNDSCAPE (Generative Dmaj9 Analog Silk Drone)
     ========================================================================== */
  startAmbient() {
    if (this.isMuted || this.mode !== 'all' || this.isAmbientPlaying || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.001, now);
      // Very gentle master ambient volume (~0.04) so it's ethereal and unobtrusive
      this.ambientGain.gain.linearRampToValueAtTime(0.042, now + 2.5);

      // Resonant Lowpass Filter with slow LFO breath
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.Q.setValueAtTime(1.8, now);

      // Slow Breathing LFO (0.07Hz filter sweep)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.07, now);
      lfoGain.gain.setValueAtTime(220, now); // Sweeps between 230Hz and 670Hz
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start(now);

      // Dmaj9 Voicing: D2 (73.4Hz), A2 (110Hz), F#3 (185Hz), C#4 (277.2Hz), E4 (329.6Hz)
      const notes = [73.4, 110.0, 185.0, 277.2, 329.6];
      const activeOscs = [];

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        // Alternate warm sine and gentle triangle
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        // Subtle micro-detune for analog warmth
        const detune = (idx - 2) * 3.5;
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);

        // Lower notes carry slightly more weight, high notes stay delicate
        const voiceGain = (0.09 / (idx + 1.2));
        oscGain.gain.setValueAtTime(voiceGain, now);

        osc.connect(oscGain);
        oscGain.connect(filter);
        osc.start(now);
        activeOscs.push(osc);
      });

      // Filter routes to ambient gain, which sends to master & subtle reverb
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.masterGain);
      if (this.convolver) {
        this.ambientGain.connect(this.convolver);
      }

      this.ambientNodes = [lfo, ...activeOscs, filter, lfoGain];
      this.isAmbientPlaying = true;
    } catch (err) {
      console.warn('Ambient start failed:', err);
    }
  }

  stopAmbient() {
    if (!this.isAmbientPlaying || !this.ctx || !this.ambientGain) return;

    try {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.linearRampToValueAtTime(0.001, now + 1.0);

      setTimeout(() => {
        this.ambientNodes.forEach(node => {
          try {
            if (node.stop) node.stop();
            if (node.disconnect) node.disconnect();
          } catch (_) {}
        });
        this.ambientNodes = [];
        this.isAmbientPlaying = false;
      }, 1100);
    } catch (err) {
      this.isAmbientPlaying = false;
    }
  }

  /* ==========================================================================
     WEBSITE TACTILE UI SOUNDS
     ========================================================================== */

  // 1. Ultra-subtle luxury haptic micro-tick on button/card hover
  playHover() {
    if (this.isMuted) return;
    const nowMs = performance.now();
    // Rate limit to at most once per 45ms to avoid sound clutter during fast cursor moves
    if (nowMs - this.lastHoverTime < 45) return;
    this.lastHoverTime = nowMs;

    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Layer 1: Sub haptic thump (feels like physical watch crown tick)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(85, now);
      subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.016);

      subGain.gain.setValueAtTime(0.038, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain);

      // Layer 2: Delicate crystalline micro-click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(2600, now);
      clickOsc.frequency.exponentialRampToValueAtTime(800, now + 0.006);

      clickGain.gain.setValueAtTime(0.014, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);

      clickOsc.connect(clickGain);
      clickGain.connect(this.masterGain);

      subOsc.start(now);
      clickOsc.start(now);
      subOsc.stop(now + 0.018);
      clickOsc.stop(now + 0.008);
    } catch (_) {}
  }

  // 2. Weighted tactile acoustic switch click (luxury button press)
  playClick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Layer 1: Damped acoustic wood/switch body
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.035);

      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);

      // Layer 2: Crisp tactile top transient
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'triangle';
      snap.frequency.setValueAtTime(1100, now);
      snap.frequency.exponentialRampToValueAtTime(300, now + 0.014);

      snapGain.gain.setValueAtTime(0.045, now);
      snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

      snap.connect(snapGain);
      snapGain.connect(this.masterGain);

      osc.start(now);
      snap.start(now);
      osc.stop(now + 0.038);
      snap.stop(now + 0.016);
    } catch (_) {}
  }

  // 3. Silky Whoosh & Warm Ascending Chime (Modal Open / Expand)
  playModalOpen() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Rising warm 5th harmony: F#4 (370Hz) -> C#5 (554Hz)
      const chord = [370, 554];
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 0.92, now + idx * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq, now + idx * 0.04 + 0.12);

        gain.gain.setValueAtTime(0.001, now + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.065, now + idx * 0.04 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (this.convolver) gain.connect(this.convolver);

        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.38);
      });
    } catch (_) {}
  }

  // 4. Soft Damped Leather/Felt Closure (Modal Close / Dismiss)
  playModalClose() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.07);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch (_) {}
  }

  // 5. Champagne Gold Crystal Chime (Subscribe Success / Entry Submitted)
  playSubscribeSuccess() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Sparkling E major 9th arpeggio: E5 (659), G#5 (830), B5 (987), D#6 (1244), F#6 (1480)
      const notes = [659.2, 830.6, 987.8, 1244.5, 1480.0];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.055);

        // Shimmering envelope with lush reverb tail
        gain.gain.setValueAtTime(0.001, now + idx * 0.055);
        gain.gain.linearRampToValueAtTime(0.09, now + idx * 0.055 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.7);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (this.convolver) gain.connect(this.convolver);

        osc.start(now + idx * 0.055);
        osc.stop(now + idx * 0.055 + 0.75);
      });
    } catch (_) {}
  }

  // 6. Secret Key Tumbler Tick (Stealth typing 'jvan' or 'vault')
  playSecretKey() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1450, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.015);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.018);
    } catch (_) {}
  }

  // 7. Soft Typewriter Input Tick (Email field keystroke)
  playInputTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1150 + Math.random() * 100, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.012);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.014);
    } catch (_) {}
  }

  /* ==========================================================================
     PIXEL RPG DETECTIVE GAME SOUND FX
     ========================================================================== */

  // 1. Soft Sneaker / Runway Floor Footstep
  playFootstep() {
    if (this.isMuted) return;
    const nowMs = performance.now();
    // Throttled footstep cadence
    if (nowMs - this.lastFootstepTime < 240) return;
    this.lastFootstepTime = nowMs;
    this.footstepStep = (this.footstepStep + 1) % 2;

    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Alternating pitch between left and right foot
      const pitch = this.footstepStep === 0 ? 98 : 112;

      // Soft low sole impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.038);

      gain.gain.setValueAtTime(0.032, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

      osc.connect(gain);
      gain.connect(this.masterGain);

      // Subtle fabric / leather scuff transient
      const scuff = this.ctx.createOscillator();
      const scuffGain = this.ctx.createGain();
      scuff.type = 'triangle';
      scuff.frequency.setValueAtTime(950 + this.footstepStep * 80, now);
      scuff.frequency.exponentialRampToValueAtTime(320, now + 0.016);

      scuffGain.gain.setValueAtTime(0.018, now);
      scuffGain.gain.exponentialRampToValueAtTime(0.001, now + 0.016);

      scuff.connect(scuffGain);
      scuffGain.connect(this.masterGain);

      osc.start(now);
      scuff.start(now);
      osc.stop(now + 0.04);
      scuff.stop(now + 0.018);
    } catch (_) {}
  }

  // 2. Rare Fabric Swatch / Evidence Clue Pickup (Golden Shimmering Chime)
  playClue() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // High-fashion ascending pentatonic shimmer: A5 (880), C#6 (1108), E6 (1318), A6 (1760)
      const freqs = [880, 1108.7, 1318.5, 1760];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.038);

        gain.gain.setValueAtTime(0.001, now + idx * 0.038);
        gain.gain.linearRampToValueAtTime(0.11, now + idx * 0.038 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.038 + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (this.convolver) gain.connect(this.convolver);

        osc.start(now + idx * 0.038);
        osc.stop(now + idx * 0.038 + 0.5);
      });
    } catch (_) {}
  }

  // 3. Vault Door Unlocked (Hydraulic slide + Brass Bell Chime)
  playDoorUnlock() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Heavy hydraulic latch slide
      const latch = this.ctx.createOscillator();
      const latchGain = this.ctx.createGain();
      latch.type = 'sine';
      latch.frequency.setValueAtTime(140, now);
      latch.frequency.exponentialRampToValueAtTime(55, now + 0.18);

      latchGain.gain.setValueAtTime(0.12, now);
      latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      latch.connect(latchGain);
      latchGain.connect(this.masterGain);
      latch.start(now);
      latch.stop(now + 0.2);

      // Brass bell unlock chord: D5 (587), F#5 (739), A5 (880), D6 (1174)
      const chord = [587.3, 739.9, 880.0, 1174.7];
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.08 + idx * 0.04);

        gain.gain.setValueAtTime(0.001, now + 0.08 + idx * 0.04);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.08 + idx * 0.04 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + idx * 0.04 + 0.65);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (this.convolver) gain.connect(this.convolver);

        osc.start(now + 0.08 + idx * 0.04);
        osc.stop(now + 0.08 + idx * 0.04 + 0.7);
      });
    } catch (_) {}
  }

  // 4. Cinematic Tension Alert / Drone Hazard (Sub-bass pulse, NOT a cheap buzzer)
  playHazard() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Deep cinematic suspense sub-bass drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.32);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.masterGain);

      // Resonant bandpass filter tension transient
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(4.0, now);

      const alertOsc = this.ctx.createOscillator();
      const alertGain = this.ctx.createGain();
      alertOsc.type = 'triangle';
      alertOsc.frequency.setValueAtTime(220, now);
      alertOsc.frequency.exponentialRampToValueAtTime(80, now + 0.22);

      alertGain.gain.setValueAtTime(0.1, now);
      alertGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      alertOsc.connect(filter);
      filter.connect(alertGain);
      alertGain.connect(this.masterGain);

      osc.start(now);
      alertOsc.start(now);
      osc.stop(now + 0.35);
      alertOsc.stop(now + 0.25);
    } catch (_) {}
  }

  // 5. Runway Victory / Level Cleared Fanfare (Maj9 synth progression with reverb)
  playLevelUp() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Elegant runway chord: C#4 (277), G#4 (415), C5 (523), F5 (698), G#5 (830)
      const chord = [277.2, 415.3, 523.2, 698.4, 830.6];
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.05 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.85);

        osc.connect(gain);
        gain.connect(this.masterGain);
        if (this.convolver) gain.connect(this.convolver);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.9);
      });
    } catch (_) {}
  }

  // 6. Game Launch Transition Riser
  playGameStart() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);
      if (this.convolver) gain.connect(this.convolver);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch (_) {}
  }

  /* ==========================================================================
     RUNWAY DEVIL (LEVEL DEVIL PLATFORMER) HYBRID ANALOG-COMEDY SYNTHESIZERS
     ========================================================================== */

  // 7. Platformer Jump (Crisp upward whoosh with subtle pitch lift)
  playJump() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(480, now + 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);
      if (this.convolver) gain.connect(this.convolver);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (_) {}
  }

  // 8. Platform Landing Thud (Soft tactile impact)
  playLand() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(95, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (_) {}
  }

  // 9. Troll Trick Trigger (Hybrid analog spring boing with pitch modulation)
  playTrollTrigger() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);

      // Comedic spring vibrato
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(26, now);
      lfoGain.gain.setValueAtTime(45, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.masterGain);
      if (this.convolver) gain.connect(this.convolver);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.35);
      osc.stop(now + 0.35);
    } catch (_) {}
  }

  // 10. Door Escape (Comedic slide whistle / glide when exit door flees)
  playDoorEscape() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.32);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch (_) {}
  }

  // 11. Spike Pop (Metallic spring release)
  playSpikePop() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_) {}
  }

  // 12. Player Poof / Death (Soft comedic air puff with instant reset tone)
  playPlayerPoof() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // White noise buffer for soft fabric puff
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
    } catch (_) {}
  }

  // 13. Stage Cleared Portal Sound
  playStageClear() {
    this.playLevelUp();
  }
}

export const soundEngine = new SoundEngine();
