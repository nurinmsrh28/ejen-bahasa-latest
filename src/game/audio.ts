class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private ambientInterval: number | null = null;
  private ambientPlaying = false;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAmbient();
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.06,
    delay = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this.playTone(440, 0.06, 'triangle', 0.04);
  }

  playClueFound() {
    this.playTone(523.25, 0.14, 'sine', 0.07, 0);
    this.playTone(659.25, 0.18, 'sine', 0.07, 0.07);
    this.playTone(783.99, 0.24, 'triangle', 0.06, 0.14);
  }

  playHint() {
    this.playTone(392, 0.14, 'triangle', 0.05, 0);
    this.playTone(493.88, 0.18, 'sine', 0.05, 0.08);
  }

  playSuccess() {
    this.playTone(440, 0.12, 'triangle', 0.06, 0);
    this.playTone(554.37, 0.14, 'triangle', 0.06, 0.08);
    this.playTone(659.25, 0.16, 'triangle', 0.06, 0.16);
    this.playTone(880, 0.32, 'sine', 0.07, 0.24);
  }

  playError() {
    this.playTone(220, 0.14, 'sawtooth', 0.035, 0);
    this.playTone(185, 0.18, 'sawtooth', 0.035, 0.09);
  }

  playPlace() {
    this.playTone(349.23, 0.09, 'triangle', 0.055, 0);
    this.playTone(523.25, 0.12, 'sine', 0.05, 0.04);
  }

  toggleAmbient() {
    if (this.ambientPlaying) {
      this.stopAmbient();
      return false;
    }
    this.startAmbient();
    return true;
  }

  startAmbient() {
    if (!this.enabled || this.ambientPlaying || typeof window === 'undefined') return;
    const notes = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440.0, 349.23];
    let step = 0;
    this.ambientPlaying = true;
    const triggerNote = () => {
      if (!this.enabled || !this.ambientPlaying) return;
      this.playTone(notes[step % notes.length], 0.9, 'sine', 0.018);
      step += 1;
    };
    triggerNote();
    this.ambientInterval = window.setInterval(triggerNote, 1100);
  }

  stopAmbient() {
    this.ambientPlaying = false;
    if (this.ambientInterval !== null) {
      window.clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  isAmbientPlaying() {
    return this.ambientPlaying;
  }
}

export const gameAudio = new GameAudioEngine();
