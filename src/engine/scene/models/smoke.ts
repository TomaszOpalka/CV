import { BALL_RADIUS, SMOKE_CENTER } from '../ballFlight';
import { hash1, smoothstep } from '../math';
import type { Pen } from '../Pen';
import { spiralMorph } from '../spiral';

/** Rear axle's distance behind the car's origin, where the tyres smoke. */
const REAR_AXLE = 1.7;
/** Outer radius of the vortex (metres) and the angle at which its outer end leaves the ground. */
const VORTEX_RADIUS = 1.7;
const VORTEX_START = -Math.PI * 0.62;

export interface SmokeDraw {
  /** Current time and the time the tyres started to smoke (seconds). */
  now: number;
  start: number;
  /** Where the car's origin was at time `t` (the puffs are born at the rear wheels). */
  carX: (t: number) => number;
  /** 0 = open vortex, 1 = closed into the ball. */
  curl: number;
  alpha: number;
  /** Line width in CSS px for the trace of the spiral. */
  lw: number;
}

const p = new Float64Array(2);
const scratch = new Float64Array(2);

/**
 * Tyre smoke that leaves the rear wheels and curls into a golden spiral (a vortex), which then
 * winds up and closes into the basketball. Every puff owns a place on the spiral: the first ones
 * born sit in the eye, the latest ones at the outer end, still attached to the tyre. A thin trace
 * through the spiral keeps its shape readable even at a coarse grid.
 */
export class Smoke {
  constructor(private readonly count = 110) {}

  draw(pen: Pen, o: SmokeDraw): void {
    const { ctx } = pen;
    if (o.alpha <= 0.002) return;
    const cx = SMOKE_CENTER.x;
    const cz = SMOKE_CENTER.z;
    const n = this.count;
    const lifespan = 0.9;
    const close = o.curl;
    ctx.fillStyle = '#fff';

    let outerMost = 1;
    for (let i = 0; i < n; i++) {
      const h = (k: number): number => hash1(i * 17.3 + k * 91.7);
      const born = o.start + lifespan * Math.pow(i / n, 1.4);
      const age = o.now - born;
      if (age <= 0) continue;
      // The first puff sits in the eye (s = 1), the last on the outer end (s = 0).
      const s = 1 - i / (n - 1);
      outerMost = Math.min(outerMost, s);

      spiralMorph(s, close, VORTEX_RADIUS, BALL_RADIUS, VORTEX_START, p, scratch);
      const side = i % 2 === 0 ? -1 : 1;
      // Where the puff would be right under the tyre, then it is drawn into its place on the spiral.
      const wheelX = o.carX(born) - REAR_AXLE;
      const gather = smoothstep(0, 0.7, age);
      const jitter = (1 - close) * 0.1;
      const x = wheelX + (cx + p[0]! + (h(1) - 0.5) * jitter - wheelX) * gather;
      const z = 0.2 + (cz + p[1]! + (h(2) - 0.5) * jitter - 0.2) * gather;
      const y = side * 0.8 * (1 - gather);

      let r = (0.12 + 0.26 * Math.min(1, age)) * (0.7 + 0.6 * h(4));
      r *= 1 - 0.75 * close;
      let a = 0.5 * Math.min(1, age / 0.3);
      a *= 1 - Math.max(0, close - 0.8) / 0.2;

      const k = 0.7 + 0.6 * h(7);
      ctx.globalAlpha = a * o.alpha * 0.07 * k;
      pen.disc(x, y, z, r);
      ctx.globalAlpha = a * o.alpha * 0.1 * k;
      pen.disc(x, y, z, r * 0.55);
    }

    // The trace of the spiral itself, from the newest puff to the eye.
    if (outerMost < 1) {
      ctx.strokeStyle = '#fff';
      ctx.lineCap = 'round';
      ctx.lineWidth = o.lw * 1.2;
      ctx.globalAlpha = 0.9 * o.alpha * (1 - smoothstep(0.7, 1, close));
      ctx.beginPath();
      const steps = 56;
      let px = 0;
      let pz = 0;
      for (let j = 0; j <= steps; j++) {
        const s = outerMost + ((1 - outerMost) * j) / steps;
        spiralMorph(s, close, VORTEX_RADIUS, BALL_RADIUS, VORTEX_START, p, scratch);
        const x = cx + p[0]!;
        const z = cz + p[1]!;
        if (j > 0) pen.line(px, 0, pz, x, 0, z);
        px = x;
        pz = z;
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}
