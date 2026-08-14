export class AudioService {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private typingEnabled = true;
  private volume = 0.5;
  private lastPlay = 0;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(v: boolean) { this.enabled = v; }
  setTypingEnabled(v: boolean) { this.typingEnabled = v; }
  setVolume(v: number) { this.volume = Math.max(0, Math.min(1, v)); }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 1) {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastPlay < 30) return; // throttle
    this.lastPlay = now;
    try {
      const ctx = this.ensureCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = this.volume * vol * 0.15;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore */ }
  }

  playKeyCorrect() {
    if (!this.typingEnabled) return;
    this.playTone(880, 0.04, 'sine', 0.6);
  }

  playKeyError() {
    if (!this.typingEnabled) return;
    this.playTone(180, 0.08, 'square', 0.5);
  }

  playClick() {
    this.playTone(600, 0.03, 'sine', 0.4);
  }

  playStart() {
    this.playTone(440, 0.08, 'sine', 0.7);
    setTimeout(() => this.playTone(550, 0.08, 'sine', 0.7), 80);
  }

  playComplete() {
    this.playTone(523, 0.1, 'sine', 0.8);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.8), 100);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.8), 200);
  }

  playAchievement() {
    this.playTone(523, 0.1, 'triangle', 0.9);
    setTimeout(() => this.playTone(659, 0.1, 'triangle', 0.9), 120);
    setTimeout(() => this.playTone(784, 0.1, 'triangle', 0.9), 240);
    setTimeout(() => this.playTone(1047, 0.2, 'triangle', 0.9), 360);
  }

  playCountdown() {
    this.playTone(660, 0.1, 'sine', 0.7);
  }

  playGameSuccess() {
    this.playTone(784, 0.12, 'sine', 0.8);
    setTimeout(() => this.playTone(1047, 0.18, 'sine', 0.8), 120);
  }

  playGameFailure() {
    this.playTone(200, 0.15, 'sawtooth', 0.5);
    setTimeout(() => this.playTone(150, 0.2, 'sawtooth', 0.5), 120);
  }
}
