import { hash1 } from '../math';
import { SMOKE_CENTER, BALL_RADIUS } from '../ballFlight';
import type { Pen } from '../Pen';

const TAU = Math.PI * 2;

/** Rear axle's distance behind the car's origin, where the tyres smoke. */
const REAR_AXLE = 1.7;

export interface SmokeDraw {
  /** Current time and the time the tyres started to smoke (seconds). */
  now: number;
  start: number;
  /** Where the car's origin was at time `t` (the puffs are born at the rear wheels). */
  carX: (t: number) => number;
  /** 0 = free smoke, 1 = collapsed into a ball. */
  curl: number;
  alpha: number;
}

/**
 * Tyre smoke as a swarm of soft discs. Every puff is born at a rear wheel, drifts up and swells; while
 * `curl` goes 0 -> 1 the whole cloud swirls around its centre and shrinks onto the surface of the ball.
 */
export class Smoke {
  constructor(private readonly count = 84) {}

  draw(pen: Pen, o: SmokeDraw): void {
    const { ctx } = pen;
    if (o.alpha <= 0.002) return;
    ctx.fillStyle = '#fff';
    const cx = SMOKE_CENTER.x;
    const cz = SMOKE_CENTER.z;
    const swirl = o.curl * o.curl * (3 - 2 * o.curl);

    for (let i = 0; i < this.count; i++) {
      const h = (k: number): number => hash1(i * 17.3 + k * 91.7);
      const born = o.start + 1.1 * Math.pow(i / this.count, 1.5);
      const age = o.now - born;
      if (age <= 0) continue;

      const side = i % 2 === 0 ? -1 : 1;
      const drift = (1 - Math.exp(-age * 1.5)) / 1.5;
      let x = o.carX(born) - REAR_AXLE + ((h(1) - 0.5) * 0.7 - 0.15) * drift;
      let y = side * 0.8 + ((h(2) - 0.5) * 0.9 + side * 0.25) * drift;
      let z = 0.2 + (0.35 + 0.7 * h(3)) * drift;
      let r = 0.1 + 0.34 * (1 - Math.exp(-age * 1.1)) * (0.6 + 0.8 * h(4));
      let a = 0.5 * Math.min(1, age / 0.15);

      if (swirl > 0) {
        const dx = x - cx;
        const dz = z - cz;
        const rho = Math.hypot(dx, dz);
        const phi = Math.atan2(dz, dx) + swirl * (4 + 3 * h(5)) * TAU * 0.5;
        const target = BALL_RADIUS * (0.55 + 0.45 * h(6));
        const rho2 = rho * (1 - swirl) + target * swirl;
        x = cx + Math.cos(phi) * rho2;
        z = cz + Math.sin(phi) * rho2;
        y = y * (1 - swirl);
        r *= 1 - 0.8 * swirl;
        a *= 1 - (0.7 * Math.max(0, swirl - 0.6)) / 0.4;
      } else {
        a *= 1 - Math.min(1, Math.max(0, (age - 1.6) / 1.8));
      }
      // two nested discs: a soft core and a wider haze, each puff a little different
      const k = 0.7 + 0.6 * h(7);
      ctx.globalAlpha = a * o.alpha * 0.085 * k;
      pen.disc(x, y, z, r);
      ctx.globalAlpha = a * o.alpha * 0.12 * k;
      pen.disc(x, y, z, r * 0.55);
    }
    ctx.globalAlpha = 1;
  }
}
