/** Small pure helpers shared by the scene code. No allocations in the hot ones. */

export const DEG = Math.PI / 180;

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 0 before `a`, 1 after `b`, linear in between. */
export const ramp = (x: number, a: number, b: number): number => clamp01((x - a) / (b - a));

/** Smooth 0 -> 1 between `a` and `b`. */
export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export const easeInOut = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(t));
export const easeInCubic = (t: number): number => t * t * t;
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Deterministic pseudo-random number in [0, 1) for an index (same input, same output). */
export function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Piecewise monotone cubic interpolation of several channels over time (a camera path).
 * Keys are `[time, ...values]`. The curve never overshoots a key and eases to a stop where two
 * neighbouring keys are equal, so "hold" segments are simply repeated keys.
 */
export class KeyTrack {
  readonly channels: number;
  private readonly times: Float64Array;
  private readonly values: Float64Array;
  private readonly slopes: Float64Array;

  constructor(keys: ReadonlyArray<readonly number[]>) {
    if (keys.length < 2) throw new Error('KeyTrack needs at least two keys');
    const n = keys.length;
    this.channels = keys[0]!.length - 1;
    this.times = new Float64Array(n);
    this.values = new Float64Array(n * this.channels);
    this.slopes = new Float64Array(n * this.channels);
    for (let k = 0; k < n; k++) {
      this.times[k] = keys[k]![0]!;
      for (let c = 0; c < this.channels; c++) this.values[k * this.channels + c] = keys[k]![c + 1]!;
    }
    for (let c = 0; c < this.channels; c++) {
      for (let k = 1; k < n - 1; k++) {
        const h0 = this.times[k]! - this.times[k - 1]!;
        const h1 = this.times[k + 1]! - this.times[k]!;
        const d0 = (this.v(k, c) - this.v(k - 1, c)) / h0;
        const d1 = (this.v(k + 1, c) - this.v(k, c)) / h1;
        if (d0 * d1 <= 0) {
          this.slopes[k * this.channels + c] = 0;
        } else {
          const w1 = 2 * h1 + h0;
          const w2 = h1 + 2 * h0;
          this.slopes[k * this.channels + c] = (w1 + w2) / (w1 / d0 + w2 / d1);
        }
      }
    }
  }

  private v(key: number, channel: number): number {
    return this.values[key * this.channels + channel]!;
  }

  /** Writes the interpolated channels at time `t` into `out`. */
  sample(t: number, out: Float64Array | number[]): void {
    const n = this.times.length;
    const ch = this.channels;
    if (t <= this.times[0]!) {
      for (let c = 0; c < ch; c++) out[c] = this.values[c]!;
      return;
    }
    if (t >= this.times[n - 1]!) {
      for (let c = 0; c < ch; c++) out[c] = this.values[(n - 1) * ch + c]!;
      return;
    }
    let k = 0;
    while (k < n - 2 && t >= this.times[k + 1]!) k++;
    const t0 = this.times[k]!;
    const h = this.times[k + 1]! - t0;
    const s = (t - t0) / h;
    const s2 = s * s;
    const s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;
    for (let c = 0; c < ch; c++) {
      out[c] =
        h00 * this.v(k, c) +
        h10 * h * this.slopes[k * ch + c]! +
        h01 * this.v(k + 1, c) +
        h11 * h * this.slopes[(k + 1) * ch + c]!;
    }
  }
}
