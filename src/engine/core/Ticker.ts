export type TickCallback = (deltaMs: number, nowMs: number) => void;

/**
 * Single shared requestAnimationFrame loop. Effects subscribe instead of
 * running their own loops; the loop stops itself when nobody is subscribed.
 */
export class Ticker {
  private readonly callbacks = new Set<TickCallback>();
  private rafId: number | null = null;
  private last = 0;

  /** Subscribe to the loop. Returns an unsubscribe function. */
  add(callback: TickCallback): () => void {
    this.callbacks.add(callback);
    this.start();
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) this.stop();
    };
  }

  get size(): number {
    return this.callbacks.size;
  }

  private start(): void {
    if (this.rafId !== null) return;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (this.rafId === null) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly tick = (now: number): void => {
    // Clamp so a long pause (hidden tab) does not produce a huge physics step.
    const delta = Math.min(now - this.last, 100);
    this.last = now;
    for (const callback of this.callbacks) callback(delta, now);
    this.rafId = this.callbacks.size > 0 ? requestAnimationFrame(this.tick) : null;
  };
}

export const ticker = new Ticker();
