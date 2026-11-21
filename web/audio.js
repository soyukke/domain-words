// Thin Web Audio player for Float32 PCM synthesized by Kizu WebAssembly.
// Strictly starts/resumes AudioContext only inside direct user gestures (iOS Safari safe).

export class PcmPlayer {
  constructor() {
    this.ctx = null;
    this.activeSource = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  stop() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // already stopped
      }
      this.activeSource = null;
    }
  }

  play(samples, sampleRate, onEnded = null) {
    this.stop();
    if (!samples || samples.length === 0) return false;
    const ctx = this.ensureContext();
    if (!ctx) return false;
    const buf = ctx.createBuffer(1, samples.length, sampleRate);
    buf.copyToChannel(samples, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    this.activeSource = src;
    src.onended = () => {
      if (this.activeSource === src) {
        this.activeSource = null;
      }
      if (onEnded) onEnded();
    };
    src.start(0);
    return true;
  }
}
