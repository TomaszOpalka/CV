const GRAVITY = 240;

/**
 * Fixed-size ring of short-lived squares: the "falling pixel star" behind the cursor. Cells are
 * emitted along the movement, drift down a little and die after well under a second.
 * No allocation after construction. Units: CSS px and seconds.
 */
export class PixelTrail {
  readonly capacity: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly age: Float32Array;
  readonly life: Float32Array;
  readonly phase: Float32Array;

  private next = 0;
  private readonly rng: () => number;

  constructor(capacity = 220, rng: () => number = Math.random) {
    this.capacity = capacity;
    this.rng = rng;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.age = new Float32Array(capacity).fill(Infinity);
    this.life = new Float32Array(capacity);
    this.phase = new Float32Array(capacity);
  }

  /** Add a square at (x, y) carrying the colour phase it was born with. */
  emit(x: number, y: number, phase: number): void {
    const i = this.next;
    this.next = (this.next + 1) % this.capacity;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = (this.rng() - 0.5) * 36;
    this.vy[i] = 10 + this.rng() * 60;
    this.age[i] = 0;
    this.life[i] = 0.45 + this.rng() * 0.4;
    this.phase[i] = phase;
  }

  isAlive(i: number): boolean {
    return this.age[i]! < this.life[i]!;
  }

  /** Advance by `dt`; returns how many squares are still alive (0 means the loop may sleep). */
  step(dt: number): number {
    let alive = 0;
    for (let i = 0; i < this.capacity; i++) {
      if (!this.isAlive(i)) continue;
      this.age[i] = this.age[i]! + dt;
      if (!this.isAlive(i)) continue;
      this.vy[i] = this.vy[i]! + GRAVITY * dt;
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + this.vy[i]! * dt;
      alive++;
    }
    return alive;
  }

  /** 0 at birth, 1 at death. */
  progress(i: number): number {
    return Math.min(1, this.age[i]! / this.life[i]!);
  }
}
