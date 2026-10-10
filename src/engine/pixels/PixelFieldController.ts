import { ticker } from '../core/Ticker';
import { PointerTracker } from '../core/PointerTracker';
import { PixelField } from './PixelField';

const TONES = 7;
const MAX_PIXELS = 7000;
const MAX_SHAKE_PX = 10;

export interface PixelFieldControllerOptions {
  canvas: HTMLCanvasElement;
  /** Element that shakes on the explosion (receives `--shake-x` / `--shake-y`). */
  shakeTarget: HTMLElement;
  onExplode: () => void;
  onCleared: () => void;
}

function cellSizeFor(width: number): number {
  return width < 600 ? 12 : 16;
}

/**
 * Drives a PixelField on a 2D canvas: sizing (DPR, ResizeObserver), pointer, one shared ticker
 * subscription that runs only while the canvas is on screen and the tab is visible, batched drawing
 * (one path and one fill per brightness level), shake and vibration on the explosion.
 */
export class PixelFieldController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: PixelFieldControllerOptions;
  private readonly pointer: PointerTracker;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver: IntersectionObserver;
  private field: PixelField | null = null;
  private width = 0;
  private height = 0;
  private unsubscribe: (() => void) | null = null;
  private onScreen = false;
  private clearedNotified = false;
  private readonly fills: string[] = [];

  constructor(options: PixelFieldControllerOptions) {
    this.options = options;
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    for (let t = 0; t < TONES; t++) {
      const v = Math.round(40 + (215 * t) / (TONES - 1));
      this.fills.push(`rgb(${v} ${v} ${v})`);
    }
    this.pointer = new PointerTracker(this.canvas, {
      mouseRadius: 120,
      touchRadius: 90,
      onPress: (x, y) => this.explode(x, y),
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.onScreen = entries.some((entry) => entry.isIntersecting);
      this.syncLoop();
    });
  }

  init(): void {
    this.resize();
    this.pointer.attach();
    this.resizeObserver.observe(this.canvas);
    this.visibilityObserver.observe(this.canvas);
    document.addEventListener('visibilitychange', this.syncLoop);
  }

  /** Start the explosion at a point (CSS px inside the canvas); `undefined` means the centre. */
  explode(x?: number, y?: number): void {
    const field = this.field;
    if (!field || field.phase !== 'idle') return;
    field.explode(x ?? this.width / 2, y ?? this.height / 2);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(40);
    this.options.onExplode();
    this.syncLoop();
  }

  /** Put the pixels back (used by the "rebuild" button). */
  reset(): void {
    if (!this.field) return;
    this.field.reset();
    this.clearedNotified = false;
    this.applyShake(0);
    this.syncLoop();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.pointer.detach();
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    document.removeEventListener('visibilitychange', this.syncLoop);
    this.applyShake(0);
  }

  private readonly syncLoop = (): void => {
    const shouldRun =
      this.onScreen && document.visibilityState === 'visible' && this.field !== null;
    if (shouldRun && !this.unsubscribe) {
      this.unsubscribe = ticker.add((deltaMs) => this.frame(deltaMs / 1000));
    } else if (!shouldRun && this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  };

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width === 0 || height === 0) return;
    if (width === this.width && height === this.height && this.field) return;
    this.width = width;
    this.height = height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let cell = cellSizeFor(width);
    while ((width / cell) * (height / cell) > MAX_PIXELS) cell += 2;
    const previous = this.field;
    // A resize in the middle of an explosion keeps what is flying; an idle field is rebuilt to the new size.
    if (previous && previous.phase !== 'idle') return;
    this.field = new PixelField(Math.ceil(width / cell), Math.ceil(height / cell), cell);
    this.syncLoop();
  }

  private frame(dt: number): void {
    const field = this.field;
    if (!field) return;
    field.step(Math.min(dt, 0.05), this.pointer.state);
    this.draw(field);
    this.applyShake(field.shake());
    if (field.phase === 'cleared' && !this.clearedNotified) {
      this.clearedNotified = true;
      this.options.onCleared();
    }
  }

  private applyShake(amount: number): void {
    const target = this.options.shakeTarget;
    if (amount <= 0) {
      target.style.removeProperty('--shake-x');
      target.style.removeProperty('--shake-y');
      return;
    }
    const a = amount * MAX_SHAKE_PX;
    target.style.setProperty('--shake-x', `${((Math.random() - 0.5) * 2 * a).toFixed(1)}px`);
    target.style.setProperty('--shake-y', `${((Math.random() - 0.5) * 2 * a).toFixed(1)}px`);
  }

  private draw(field: PixelField): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const size = field.cell - 2;
    const half = size / 2;
    const top = TONES - 1;

    for (let t = 0; t < TONES; t++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < field.count; i++) {
        if (field.attached[i] === 0 && field.life[i]! <= 0) continue;
        if (Math.min(top, Math.round(field.level[i]! * top)) !== t) continue;
        ctx.rect(field.x[i]! - half, field.y[i]! - half, size, size);
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = this.fills[t]!;
      ctx.fill();
    }
  }
}
