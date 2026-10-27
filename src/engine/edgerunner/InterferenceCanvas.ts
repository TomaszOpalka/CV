import { ticker } from '../core/Ticker';
import { mulberry32, type Rng } from './lightning';

/** The canvas is drawn this many times smaller than it is shown, which gives the streaks their blocky look. */
const SCALE = 3;
const FRAME_MS = 85;
const MAX_STREAKS = 9;
const COLOURS = [
  '255, 255, 255',
  '255, 255, 255',
  '255, 110, 215',
  '255, 110, 215',
  '0, 240, 255',
  '12, 0, 8',
] as const;

interface Streak {
  x: number;
  y: number;
  width: number;
  height: number;
  rgb: string;
  alpha: number;
  life: number;
}

/**
 * The "interference" of the contact band: short horizontal streaks of white, pink and black that flash up, live a few
 * frames and vanish, and slices of the picture that jump sideways. Drawn at low resolution at about 12 fps, only
 * while the band is on screen. With `animate` off it paints one still frame.
 */
export class InterferenceCanvas {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly rng: Rng = mulberry32((Date.now() & 0xffff) + 3);
  private streaks: Streak[] = [];
  private width = 1;
  private height = 1;
  private visible = false;
  private elapsed = 0;
  private stop: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private visibilityObserver: IntersectionObserver | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly animate: boolean,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
  }

  init(): void {
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    if (!this.animate) {
      for (let i = 0; i < 10; i++) this.spawn();
      this.draw();
      return;
    }
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      this.update();
    });
    this.visibilityObserver.observe(this.canvas);
    document.addEventListener('visibilitychange', this.update);
  }

  destroy(): void {
    this.stop?.();
    this.stop = null;
    this.resizeObserver?.disconnect();
    this.visibilityObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.update);
  }

  private readonly update = (): void => {
    const run = this.visible && !document.hidden;
    if (run && !this.stop) this.stop = ticker.add(this.tick);
    else if (!run && this.stop) {
      this.stop();
      this.stop = null;
    }
  };

  private resize(): void {
    const { clientWidth, clientHeight } = this.canvas;
    this.width = Math.max(1, Math.ceil(clientWidth / SCALE));
    this.height = Math.max(1, Math.ceil(clientHeight / SCALE));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (!this.animate) {
      this.streaks = [];
      for (let i = 0; i < 10; i++) this.spawn();
      this.draw();
    }
  }

  private spawn(): void {
    const { rng } = this;
    // The text sits in the middle-left, so the streaks gather on the right (over the art) and at the far left edge.
    const left = rng() < 0.28;
    const width = this.width * (left ? 0.03 + rng() * 0.08 : 0.04 + rng() * 0.26);
    const x = left
      ? rng() * this.width * 0.04
      : this.width * 0.5 + rng() * (this.width * 0.5 - width);
    this.streaks.push({
      x: Math.max(0, Math.min(this.width - width, x)),
      y: Math.floor(rng() * this.height),
      width,
      height: 1 + Math.floor(rng() * 2),
      rgb: COLOURS[Math.floor(rng() * COLOURS.length)]!,
      alpha: 0.25 + rng() * 0.5,
      life: 2 + Math.floor(rng() * 6),
    });
  }

  private readonly tick = (delta: number): void => {
    this.elapsed += delta;
    if (this.elapsed < FRAME_MS) return;
    this.elapsed = 0;
    this.streaks = this.streaks.filter((streak) => --streak.life > 0);
    const spawns = this.rng() < 0.7 ? 1 + Math.floor(this.rng() * 3) : 0;
    for (let i = 0; i < spawns && this.streaks.length < MAX_STREAKS; i++) this.spawn();
    this.draw();
  };

  private draw(): void {
    const { ctx, width, height, rng } = this;
    ctx.clearRect(0, 0, width, height);
    for (const streak of this.streaks) {
      ctx.fillStyle = `rgba(${streak.rgb}, ${streak.alpha})`;
      ctx.fillRect(streak.x, streak.y, streak.width, streak.height);
    }
    // A slice that jumps sideways.
    if (rng() < 0.4) {
      const sliceHeight = 2 + Math.floor(rng() * 6);
      const y = Math.floor(rng() * Math.max(1, height - sliceHeight));
      const shift = (rng() < 0.5 ? -1 : 1) * (3 + Math.floor(rng() * 12));
      ctx.drawImage(this.canvas, 0, y, width, sliceHeight, shift, y, width, sliceHeight);
    }
  }
}
