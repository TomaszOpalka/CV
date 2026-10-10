import { ticker } from '../core/Ticker';
import { HEAT_COLORS } from './heatPalette';
import { CHARGE_SECONDS, PixelField, type HeatInput } from './PixelField';

const MAX_PIXELS = 16000;
const MAX_SHAKE_PX = 10;
/** Colour of cold cells: the faint grid you see before anything heats up. */
const COLD_COLOR = '#151515';

export interface PixelFieldControllerOptions {
  canvas: HTMLCanvasElement;
  /** Element that shakes on the explosion (receives `--shake-x` / `--shake-y`). */
  shakeTarget: HTMLElement;
  onExplode: () => void;
  onCleared: () => void;
}

function cellSizeFor(width: number): number {
  return width < 600 ? 10 : 12;
}

/**
 * Drives a PixelField on a 2D canvas that spans the full width of the page: sizing (DPR, ResizeObserver),
 * pointer (hover heats, holding makes the heat grow and finally explodes the field), one shared ticker
 * subscription that runs only while the canvas is on screen and the tab is visible, batched drawing
 * (one path and one fill per colour), shake and vibration on the explosion.
 */
export class PixelFieldController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: PixelFieldControllerOptions;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver: IntersectionObserver;
  private readonly input: HeatInput = { x: -9999, y: -9999, active: false, hold: 0 };
  private field: PixelField | null = null;
  private width = 0;
  private height = 0;
  private unsubscribe: (() => void) | null = null;
  private onScreen = false;
  private holding = false;
  private clearedNotified = false;

  constructor(options: PixelFieldControllerOptions) {
    this.options = options;
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.onScreen = entries.some((entry) => entry.isIntersecting);
      this.syncLoop();
    });
  }

  init(): void {
    this.resize();
    const el = this.canvas;
    el.addEventListener('pointermove', this.onMove, { passive: true });
    el.addEventListener('pointerdown', this.onDown, { passive: true });
    el.addEventListener('pointerup', this.onUp, { passive: true });
    el.addEventListener('pointercancel', this.onUp, { passive: true });
    el.addEventListener('pointerleave', this.onLeave, { passive: true });
    this.resizeObserver.observe(el);
    this.visibilityObserver.observe(el);
    document.addEventListener('visibilitychange', this.syncLoop);
  }

  /** Start the explosion at a point (CSS px inside the canvas); no arguments means the centre. */
  explode(x?: number, y?: number): void {
    const field = this.field;
    if (!field || field.phase !== 'idle') return;
    field.explode(x ?? this.width / 2, y ?? this.height / 2);
    this.holding = false;
    if (typeof navigator.vibrate === 'function') navigator.vibrate(40);
    this.options.onExplode();
    this.syncLoop();
  }

  /** Put the pixels back (used by the "rebuild" button). */
  reset(): void {
    if (!this.field) return;
    this.field.reset();
    this.input.hold = 0;
    this.clearedNotified = false;
    this.applyShake(0);
    this.syncLoop();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    const el = this.canvas;
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointercancel', this.onUp);
    el.removeEventListener('pointerleave', this.onLeave);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    document.removeEventListener('visibilitychange', this.syncLoop);
    this.applyShake(0);
  }

  private locate(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.input.x = event.clientX - rect.left;
    this.input.y = event.clientY - rect.top;
  }

  private readonly onMove = (event: PointerEvent): void => {
    this.locate(event);
    this.input.active = event.pointerType === 'mouse' || this.holding;
  };

  private readonly onDown = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0) return;
    this.locate(event);
    this.holding = true;
    this.input.active = true;
  };

  private readonly onUp = (): void => {
    this.holding = false;
    if (this.input.hold < 0.05) this.input.active = false;
  };

  private readonly onLeave = (): void => {
    this.holding = false;
    this.input.active = false;
  };

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
    // A resize in the middle of an explosion keeps what is flying; an idle field is rebuilt to the new size.
    if (this.field && this.field.phase !== 'idle') return;
    this.field = new PixelField(Math.ceil(width / cell), Math.ceil(height / cell), cell);
    this.syncLoop();
  }

  private frame(dt: number): void {
    const field = this.field;
    if (!field) return;
    const step = Math.min(dt, 0.05);

    // Holding charges the field; letting go drains the charge quickly so the spot shrinks smoothly.
    const input = this.input;
    input.hold = this.holding ? input.hold + step : Math.max(0, input.hold - step * 2.5);
    if (this.holding && field.phase === 'idle' && input.hold >= CHARGE_SECONDS) {
      this.explode(input.x, input.y);
    }

    field.step(step, input);
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
    const size = field.cell - 1;
    const half = size / 2;
    const idle = field.phase === 'idle';

    // Cold cells first: the faint grid that is there before anything heats up.
    if (idle) {
      ctx.beginPath();
      for (let i = 0; i < field.count; i++) {
        if (field.bucket[i] !== -1) continue;
        ctx.rect(field.homeX[i]! - half, field.homeY[i]! - half, size, size);
      }
      ctx.fillStyle = COLD_COLOR;
      ctx.fill();
    }

    for (let colour = 0; colour < HEAT_COLORS.length; colour++) {
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < field.count; i++) {
        if (field.bucket[i] !== colour) continue;
        ctx.rect(field.x[i]! - half, field.y[i]! - half, size, size);
        any = true;
      }
      if (!any) continue;
      ctx.fillStyle = HEAT_COLORS[colour]!;
      ctx.fill();
    }
  }
}
