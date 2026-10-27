import { ticker } from '../core/Ticker';
import { makeBolt, makeBranches, mulberry32, randomTarget, type Point } from './lightning';

/** When the theme is swapped (the white flash is at its brightest) and when everything has faded out. */
const PEAK_MS = 950;
const TOTAL_MS = 1800;
const MAX_DPR = 1.5;
const RED = '255, 36, 68';

interface LiveBolt {
  path: Path2D;
  width: number;
  born: number;
}

function toPath(points: readonly Point[]): Path2D {
  const path = new Path2D();
  const first = points[0];
  if (!first) return path;
  path.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i]!.x, points[i]!.y);
  return path;
}

/**
 * Red lightning that grows out of the button, thicker and denser until it covers the screen, then a white flash
 * at which the new look is swapped in, then everything fades away. One full-screen click-through canvas.
 */
export class LightningTransition {
  private readonly ctx: CanvasRenderingContext2D;
  private bolts: LiveBolt[] = [];
  private stop: (() => void) | null = null;
  private done: (() => void) | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
  }

  /** Plays the effect from `origin` (CSS px); `onPeak` runs once, under the flash. Resolves when the canvas is clear. */
  play(origin: Point, onPeak: () => void): Promise<void> {
    this.finish();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.dataset.active = 'true';
    this.bolts = [];

    const rng = mulberry32((Date.now() & 0xffff) + 1);
    const reachMax = Math.hypot(width, height);
    const start = performance.now();
    let nextSpawn = 0;
    let peaked = false;

    return new Promise<void>((resolve) => {
      this.done = resolve;
      this.stop = ticker.add((_delta, now) => {
        const t = now - start;
        const progress = Math.min(1, t / PEAK_MS);

        // Spawn: first a few strikes straight down both ways, then more and more, in every direction.
        while (t < PEAK_MS && t >= nextSpawn) {
          const burst = 1 + Math.floor(progress * 3);
          for (let i = 0; i < burst; i++) {
            const target =
              nextSpawn < 200
                ? randomTarget(
                    origin,
                    reachMax * (0.5 + rng() * 0.3),
                    rng,
                    Math.PI / 2 + (i % 2 ? 0.55 : -0.55),
                    0.3,
                  )
                : randomTarget(
                    origin,
                    reachMax * (0.25 + progress * 0.75) * (0.5 + rng() * 0.5),
                    rng,
                  );
            const main = makeBolt(origin, target, rng, 7, 0.2);
            const path = new Path2D();
            path.addPath(toPath(main));
            for (const branch of makeBranches(main, rng, 1 + Math.floor(progress * 3), 0.35)) {
              path.addPath(toPath(branch));
            }
            this.bolts.push({ path, width: 1.6 + progress * 2.4 + rng(), born: t });
          }
          nextSpawn += 150 - progress * 110;
        }

        if (!peaked && t >= PEAK_MS) {
          peaked = true;
          onPeak();
        }

        this.draw(width, height, dpr, t);
        if (t >= TOTAL_MS) this.finish();
      });
    });
  }

  private draw(width: number, height: number, dpr: number, t: number): void {
    const { ctx } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const fade =
      t < PEAK_MS + 150 ? 1 : Math.max(0, 1 - (t - PEAK_MS - 150) / (TOTAL_MS - PEAK_MS - 150));
    for (const bolt of this.bolts) {
      const flicker = (0.7 + Math.random() * 0.3) * fade;
      const age = Math.min(1, (t - bolt.born) / 120);
      const alpha = flicker * age;
      ctx.strokeStyle = `rgba(${RED}, ${0.16 * alpha})`;
      ctx.lineWidth = bolt.width * 5;
      ctx.stroke(bolt.path);
      ctx.strokeStyle = `rgba(${RED}, ${0.6 * alpha})`;
      ctx.lineWidth = bolt.width * 2;
      ctx.stroke(bolt.path);
      ctx.strokeStyle = `rgba(255, 240, 240, ${alpha})`;
      ctx.lineWidth = Math.max(1, bolt.width * 0.7);
      ctx.stroke(bolt.path);
    }

    // The flash: up to the peak, then gone within half a second.
    const flash =
      t < PEAK_MS - 160
        ? 0
        : t < PEAK_MS
          ? (t - (PEAK_MS - 160)) / 160
          : Math.max(0, 1 - (t - PEAK_MS) / 520);
    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 244, 244, ${0.92 * flash})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private finish(): void {
    this.stop?.();
    this.stop = null;
    this.bolts = [];
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    delete this.canvas.dataset.active;
    this.done?.();
    this.done = null;
  }

  destroy(): void {
    this.finish();
  }
}
