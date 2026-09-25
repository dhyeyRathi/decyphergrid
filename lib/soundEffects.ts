// DecypherGrid — Web Audio API Sound Effects Synthesizer
// Clean, low-latency procedural audio cues

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // A sleek, subtle UI "tick" for selecting cards
  public playCardClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "square";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.05);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(filter).connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  // A beautiful, shimmering chime for correct answers
  public playCorrect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    
    const t = this.ctx.currentTime;
    // C major 7th chord spread out
    const notes = [523.25, 659.25, 783.99, 987.77]; 
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t + idx * 0.05);

      gain.gain.setValueAtTime(0.1, t + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.05 + 0.8);

      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(t + idx * 0.05);
      osc.stop(t + idx * 0.05 + 1.0);
    });
  }

  // A deep, muffled buzzer for incorrect/neutral
  public playWrong() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc1.type = "sawtooth";
    osc2.type = "square";
    osc1.frequency.setValueAtTime(150, t);
    osc2.frequency.setValueAtTime(145, t); // slight dissonance

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.3);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain).connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.3);
    osc2.stop(t + 0.3);
  }

  // A cinematic, terrifying bass drop for Assassin
  public playAssassin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    
    sub.type = "sine";
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 1.5);
    
    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    const noise = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noise.type = "sawtooth";
    noise.frequency.setValueAtTime(80, t);
    noise.frequency.exponentialRampToValueAtTime(10, t + 1.0);
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    sub.connect(subGain).connect(this.ctx.destination);
    noise.connect(noiseGain).connect(this.ctx.destination);
    
    sub.start(t);
    noise.start(t);
    sub.stop(t + 2.0);
    noise.stop(t + 2.0);
  }

  // A futuristic "whoosh" for submitting clues
  public playClueSubmit() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.2);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.linearRampToValueAtTime(2000, t + 0.2);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(filter).connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  // A triumphant, full fanfare for victory
  public playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // A major chord sequence: A4, C#5, E5, A5
    const chord1 = [440.00, 554.37, 659.25];
    const chord2 = [440.00, 554.37, 659.25, 880.00];

    // Play first quick chord
    chord1.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });

    // Play final sustained chord
    chord2.forEach(freq => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t + 0.2);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      osc.connect(gain).connect(this.ctx!.destination);
      osc.start(t + 0.2);
      osc.stop(t + 1.5);
    });
  }
}

export const sounds = new SoundEffectsManager();
