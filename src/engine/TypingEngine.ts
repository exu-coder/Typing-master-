import { TypingMetrics } from '../models/types';

export type KeyHandler = (info: {
  correct: boolean;
  expected: string;
  received: string;
  position: number;
}) => void;

export class TypingEngine {
  private targetText = '';
  private position = 0;
  private errors = 0;
  private correctChars = 0;
  private incorrectChars = 0;
  private backspaces = 0;
  private startTime = 0;
  private elapsedPaused = 0;
  private pauseStart = 0;
  private isPaused = false;
  private isRunning = false;
  private isComplete = false;
  private typedChars: { char: string; correct: boolean }[] = [];
  private onKey?: KeyHandler;
  private onUpdate?: (m: TypingMetrics) => void;
  private onComplete?: (m: TypingMetrics) => void;
  private allowBackspace = true;
  private lastKeyTime = 0;

  setText(text: string) {
    this.targetText = text;
    this.reset();
  }

  setAllowBackspace(v: boolean) {
    this.allowBackspace = v;
  }

  onKeyPress(handler: KeyHandler) {
    this.onKey = handler;
  }

  onMetricsUpdate(handler: (m: TypingMetrics) => void) {
    this.onUpdate = handler;
  }

  onFinished(handler: (m: TypingMetrics) => void) {
    this.onComplete = handler;
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.elapsedPaused = 0;
    this.lastKeyTime = this.startTime;
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.pauseStart = performance.now();
  }

  resume() {
    if (!this.isPaused) return;
    this.elapsedPaused += performance.now() - this.pauseStart;
    this.isPaused = false;
  }

  reset() {
    this.position = 0;
    this.errors = 0;
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.backspaces = 0;
    this.startTime = 0;
    this.elapsedPaused = 0;
    this.isPaused = false;
    this.isRunning = false;
    this.isComplete = false;
    this.typedChars = [];
    this.lastKeyTime = 0;
  }

  getPosition() { return this.position; }
  getTarget() { return this.targetText; }
  getIsComplete() { return this.isComplete; }
  getIsRunning() { return this.isRunning && !this.isPaused; }
  getIsPaused() { return this.isPaused; }

  handleKeyDown(e: KeyboardEvent): boolean {
    if (!this.isRunning || this.isPaused || this.isComplete) return false;

    // Prevent browser defaults for typing keys
    const prevent = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (prevent.includes(e.key) || e.key === 'Backspace') {
      e.preventDefault();
    }

    if (e.key === 'Backspace') {
      if (!this.allowBackspace || this.position === 0) return true;
      this.position--;
      this.backspaces++;
      if (this.typedChars.length) {
        const last = this.typedChars.pop();
        if (last && !last.correct) {
          // error was already counted
        }
      }
      this.emitUpdate();
      return true;
    }

    // Ignore pure modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
      return false;
    }

    const expected = this.targetText[this.position];
    if (expected === undefined) return true;

    const received = e.key;
    const correct = received === expected;

    const now = performance.now();
    const dt = now - this.lastKeyTime;
    this.lastKeyTime = now;

    this.typedChars.push({ char: received, correct });

    if (correct) {
      this.correctChars++;
      this.position++;
    } else {
      this.incorrectChars++;
      this.errors++;
      // Still advance for most lessons (can be configured)
      this.position++;
    }

    this.onKey?.({
      correct,
      expected,
      received,
      position: this.position
    });

    this.emitUpdate();

    if (this.position >= this.targetText.length) {
      this.isComplete = true;
      this.isRunning = false;
      const metrics = this.getMetrics();
      this.onComplete?.(metrics);
    }

    return true;
  }

  getMetrics(): TypingMetrics {
    const elapsedMs = this.getElapsedMs();
    const minutes = elapsedMs / 60000 || 1 / 60000;
    const totalTyped = this.correctChars + this.incorrectChars;
    const grossWpm = Math.round((totalTyped / 5) / minutes);
    const netWpm = Math.max(0, Math.round(((totalTyped / 5) - this.errors) / minutes));
    const accuracy = totalTyped > 0
      ? Math.round((this.correctChars / totalTyped) * 1000) / 10
      : 100;
    const progress = this.targetText.length
      ? Math.min(100, (this.position / this.targetText.length) * 100)
      : 0;

    return {
      wpm: grossWpm,
      netWpm,
      cpm: Math.round(totalTyped / minutes),
      accuracy,
      errors: this.errors,
      correctChars: this.correctChars,
      incorrectChars: this.incorrectChars,
      backspaces: this.backspaces,
      elapsedMs,
      progress,
      charsPerSecond: elapsedMs > 0 ? totalTyped / (elapsedMs / 1000) : 0,
      wordsTyped: Math.floor(this.correctChars / 5)
    };
  }

  private getElapsedMs(): number {
    if (!this.startTime) return 0;
    const now = this.isPaused ? this.pauseStart : performance.now();
    return Math.max(0, now - this.startTime - this.elapsedPaused);
  }

  private emitUpdate() {
    this.onUpdate?.(this.getMetrics());
  }

  getDisplayState(): { char: string; state: 'pending' | 'current' | 'correct' | 'error' }[] {
    const result: { char: string; state: 'pending' | 'current' | 'correct' | 'error' }[] = [];
    for (let i = 0; i < this.targetText.length; i++) {
      let state: 'pending' | 'current' | 'correct' | 'error' = 'pending';
      if (i < this.position) {
        const typed = this.typedChars[i];
        state = typed && typed.correct ? 'correct' : 'error';
      } else if (i === this.position) {
        state = 'current';
      }
      result.push({ char: this.targetText[i], state });
    }
    return result;
  }
}
