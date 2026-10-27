import { ticker } from '../core/Ticker';
import { makeBolt, makeBranches, mulberry32, randomTarget, type Point } from './lightning';

const MAX_DPR = 1.5;
const RED = '255, 42, 85';
const CYAN = '0, 240, 255';
/** The set of bolts is redrawn this often, which is what makes it crackle. */
const FLICKER_MS = 85;
const BURST_MS = 170;
const HALO_SIZE = 96;

interface BoltSet {
  path: Path2D;
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
 * A laser dot at the pointer with short lightning crackling out of it (the "edgerunner" cursor). Sleeps while the
 * pointer is outside the window. The dot is centred on the real pointer position.
 */
export class LaserCursor {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly halo: Record<'red' | 'cyan', HTMLCanvasElement>;
  private readonly rng = mulberry32((Date.now() & 0xffff) + 7);
  private stopTicker: (() => void) | null = null;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private x = -100;
  private y = -100;
  private lastX = -100;
  private lastY = -100;
  private speed = 0;
  private hover = false;
  private pressedAt = -Infinity;
  private set: BoltSet | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.halo = { red: this.makeHalo(RED), cyan: this.makeHalo(CYAN) };
  }

  init(): void {
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerdown', this.onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    document.documentElement.setAttribute('data-laser-ready', '');
  }

  destroy(): void {
    this.stopTicker?.();
    this.stopTicker = null;
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerdown', this.onDown);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    document.documentElement.removeAttribute('data-laser-ready');
    this.clear();
  }

  private makeHalo(rgb: string): HTMLCanvasElement {
    const halo = document.createElement('canvas');
    halo.width = HALO_SIZE;
    halo.height = HALO_SIZE;
    const ctx = halo.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        HALO_SIZE / 2,
        HALO_SIZE / 2,
        0,
        HALO_SIZE / 2,
        HALO_SIZE / 2,
        HALO_SIZE / 2,
      );
      gradient.addColorStop(0, `rgba(${rgb}, 0.95)`);
      gradient.addColorStop(0.25, `rgba(${rgb}, 0.4)`);
      gradient.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, HALO_SIZE, HALO_SIZE);
    }
    return halo;
  }

  private readonly resize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  };

  private readonly onMove = (event: PointerEvent): void => {
    this.x = event.clientX;
    this.y = event.clientY;
    const target = event.target;
    this.hover =
      target instanceof Element &&
      target.closest('a, button, [role="button"], [data-cursor="link"]') !== null;
    if (!this.stopTicker) {
      this.lastX = this.x;
      this.lastY = this.y;
      this.stopTicker = ticker.add(this.tick);
    }
  };

  private readonly onDown = (): void => {
    this.pressedAt = performance.now();
    this.set = null;
  };

  private readonly onLeave = (): void => {
    this.stopTicker?.();
    this.stopTicker = null;
    this.clear();
  };

  private clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private newSet(now: number, burst: boolean): BoltSet {
    const origin = { x: this.x, y: this.y };
    const count = burst ? 9 : this.hover ? 5 : 3 + (this.speed > 400 ? 2 : 0);
    const path = new Path2D();
    for (let i = 0; i < count; i++) {
      const length = burst
        ? 90 + this.rng() * 130
        : 22 + this.rng() * (this.hover ? 70 : 52) + this.speed * 0.05;
      const bolt = makeBolt(origin, randomTarget(origin, length, this.rng), this.rng, 3, 0.32);
      path.addPath(toPath(bolt));
      if (this.rng() < 0.35) {
        const [branch] = makeBranches(
          makeBolt(origin, randomTarget(origin, length, this.rng), this.rng, 4),
          this.rng,
          1,
          0.4,
        );
        if (branch) path.addPath(toPath(branch));
      }
    }
    return { path, born: now };
  }

  private readonly tick = (delta: number, now: number): void => {
    const dt = Math.max(delta, 1) / 1000;
    this.speed =
      this.speed * 0.8 + (Math.hypot(this.x - this.lastX, this.y - this.lastY) / dt) * 0.2;
    this.lastX = this.x;
    this.lastY = this.y;

    const burst = now - this.pressedAt < BURST_MS;
    if (!this.set || now - this.set.born >= (burst ? 40 : FLICKER_MS))
      this.set = this.newSet(now, burst);

    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const rgb = this.hover ? CYAN : RED;
    ctx.strokeStyle = `rgba(${rgb}, 0.22)`;
    ctx.lineWidth = 5;
    ctx.stroke(this.set.path);
    ctx.strokeStyle = `rgba(${rgb}, 0.8)`;
    ctx.lineWidth = 2;
    ctx.stroke(this.set.path);
    ctx.strokeStyle = 'rgba(255, 245, 245, 0.95)';
    ctx.lineWidth = 0.9;
    ctx.stroke(this.set.path);

    const halo = this.hover ? this.halo.cyan : this.halo.red;
    const size = burst ? HALO_SIZE : HALO_SIZE * 0.62;
    ctx.drawImage(halo, this.x - size / 2, this.y - size / 2, size, size);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  };
}
