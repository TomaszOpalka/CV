import { ticker } from '../core/Ticker';
import { HEAT_COLORS } from '../pixels/heatPalette';
import { resolveCursorTarget, sameTarget, type CursorTarget } from '../ui/cursorTarget';
import { waveColor, type CursorTheme } from './cursorPalette';
import { HeatBrush } from './HeatBrush';
import { ICONS } from './pixelIcons';

/** Size of one square of the comet in CSS px. */
const CELL = 10;
/** Radius of the brush (outer navy edge) in CSS px. */
const BRUSH_RADIUS = 46;
const ICON_CELL = 4;
const FOLLOW_RATE = 34;
/** Colour wave of the icon: a new colour every ~40 px of travel, plus a slow drift in time. */
const PHASE_PER_PX = 0.025;
const PHASE_PER_SECOND = 1.2;
/** After this long without moving the cursor turns into its icon. */
const REST_MS = 280;
const MOVING_PX_PER_SECOND = 30;
const OUTLINE = '#0b0b0b';
const OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
];
const LABEL_FONT = '600 11px ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Offsets (in cells) of the small plus-shaped blob used over the pixel field, where the field is the comet. */
const BLOB: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 2],
  [0, 1, 2],
];

/**
 * The pixel cursor: a full-screen, click-through canvas. Moving the pointer paints a comet of heat-coloured
 * squares (red-hot core, lime, amber, blue, navy edge) that cools and vanishes within about half a second.
 * At rest, or over links and cards, the cursor turns into a pixel-art icon. Over the pixel field only a small
 * blob follows the pointer, because the field itself lights up there. One shared ticker subscription;
 * it sleeps when the pointer has left and the comet is gone.
 */
export class CursorController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private brush: HeatBrush | null = null;
  private unsubscribe: (() => void) | null = null;
  private width = 0;
  private height = 0;

  private px = -100;
  private py = -100;
  private hx = -100;
  private hy = -100;
  private lastX = -100;
  private lastY = -100;
  private inside = false;
  private pressed = false;
  private phase = 0;
  private restMs = 0;
  private resolveMs = 0;
  private target: CursorTarget = { kind: 'default', icon: 'heart', theme: 'negative', label: '' };
  private labelWidth = 0;
  private labelFor = '';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
  }

  init(): void {
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerdown', this.onDown, { passive: true });
    window.addEventListener('pointerup', this.onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    document.documentElement.setAttribute('data-cursor-ready', '');
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    document.documentElement.removeAttribute('data-cursor-ready');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private readonly resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.brush = new HeatBrush(Math.ceil(this.width / CELL), Math.ceil(this.height / CELL), CELL);
  };

  private wake(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = ticker.add((deltaMs) => this.frame(deltaMs / 1000));
  }

  private readonly onMove = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    this.px = event.clientX;
    this.py = event.clientY;
    if (!this.inside) {
      this.inside = true;
      this.hx = this.lastX = this.px;
      this.hy = this.lastY = this.py;
    }
    const next = resolveCursorTarget(event.target instanceof Element ? event.target : null);
    if (!sameTarget(this.target, next)) this.target = next;
    this.wake();
  };

  private readonly onDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    this.pressed = true;
    // A bigger puff of heat under the pointer.
    this.brush?.stamp(this.hx, this.hy, BRUSH_RADIUS * 1.5, 1.4);
    this.wake();
  };

  private readonly onUp = (): void => {
    this.pressed = false;
  };

  private readonly onLeave = (): void => {
    this.inside = false;
  };

  private frame(dt: number): void {
    const step = Math.min(dt, 0.05);
    const k = 1 - Math.exp(-FOLLOW_RATE * step);
    const prevX = this.hx;
    const prevY = this.hy;
    if (this.inside) {
      this.hx += (this.px - this.hx) * k;
      this.hy += (this.py - this.hy) * k;
    }
    const moved = Math.hypot(this.hx - prevX, this.hy - prevY);

    if (moved / step > MOVING_PX_PER_SECOND) {
      this.restMs = 0;
      this.phase += moved * PHASE_PER_PX + step * PHASE_PER_SECOND;
    } else {
      this.restMs += step * 1000;
    }

    // Scrolling or a section changing under a still pointer changes the target without a pointer event.
    this.resolveMs += step * 1000;
    if (this.inside && this.resolveMs > 120) {
      this.resolveMs = 0;
      const next = resolveCursorTarget(document.elementFromPoint(this.px, this.py));
      if (!sameTarget(this.target, next)) this.target = next;
    }

    const brush = this.brush;
    const paints = this.target.theme !== 'heat';
    if (brush && this.inside && paints && moved > 0.1) {
      brush.stampSegment(this.lastX, this.lastY, this.hx, this.hy, BRUSH_RADIUS);
    }
    this.lastX = this.hx;
    this.lastY = this.hy;
    const lit = brush ? brush.step(step) : 0;

    this.draw();

    if (!this.inside && lit === 0) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.unsubscribe?.();
      this.unsubscribe = null;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBrush();
    if (!this.inside) return;

    const theme: CursorTheme = this.target.theme;
    const resting = this.restMs > REST_MS;
    const icon = resting || this.target.kind !== 'default';
    if (this.target.kind === 'text') this.drawBitmap(ICONS.beam, theme);
    else if (icon) this.drawBitmap(ICONS[this.target.icon], theme);
    else if (this.target.theme === 'heat') this.drawBlob(theme);
    if (this.target.label) this.drawLabel();
  }

  /** The comet: one path and one fill per colour. */
  private drawBrush(): void {
    const brush = this.brush;
    const bounds = brush?.bounds();
    if (!brush || !bounds) return;
    const ctx = this.ctx;
    const size = CELL - 1;
    for (let colour = 0; colour < HEAT_COLORS.length; colour++) {
      ctx.beginPath();
      let any = false;
      for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
        for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
          if (brush.bucket(r * brush.cols + c) !== colour) continue;
          ctx.rect(c * CELL, r * CELL, size, size);
          any = true;
        }
      }
      if (!any) continue;
      ctx.fillStyle = HEAT_COLORS[colour]!;
      ctx.fill();
    }
  }

  private drawBlob(theme: CursorTheme): void {
    const ctx = this.ctx;
    const cell = 6;
    const size = this.pressed ? cell - 2 : cell + 1;
    const cx = Math.round(this.hx / cell) * cell;
    const cy = Math.round(this.hy / cell) * cell;
    // A dark outline first, so the blob reads on top of bright squares.
    ctx.fillStyle = OUTLINE;
    for (const [ox, oy] of BLOB) {
      ctx.fillRect(
        cx + ox * cell - size / 2 - 2,
        cy + oy * cell - size / 2 - 2,
        size + 4,
        size + 4,
      );
    }
    for (const [ox, oy, shift] of BLOB) {
      ctx.fillStyle = waveColor(theme, this.phase + shift);
      ctx.fillRect(cx + ox * cell - size / 2, cy + oy * cell - size / 2, size, size);
    }
  }

  private drawBitmap(rows: readonly string[], theme: CursorTheme): void {
    const ctx = this.ctx;
    const cell = this.pressed ? ICON_CELL - 1 : ICON_CELL;
    const width = rows[0]!.length * cell;
    const height = rows.length * cell;
    const left = Math.round(this.hx - width / 2);
    const top = Math.round(this.hy - height / 2);
    const slow = this.phase * 0.5;
    // Pass 0: a dark outline (the bitmap shifted in four directions) so the icon reads on any background.
    // Pass 1: the colours.
    ctx.fillStyle = OUTLINE;
    for (const [dx, dy] of OUTLINE_OFFSETS) {
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]!;
        for (let c = 0; c < row.length; c++) {
          if (row[c] === '#') ctx.fillRect(left + c * cell + dx, top + r * cell + dy, cell, cell);
        }
      }
    }
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]!;
      for (let c = 0; c < row.length; c++) {
        if (row[c] !== '#') continue;
        ctx.fillStyle = waveColor(theme, slow + (r + c) * 0.18);
        ctx.fillRect(left + c * cell, top + r * cell, cell, cell);
      }
    }
  }

  private drawLabel(): void {
    const ctx = this.ctx;
    const label = this.target.label;
    ctx.font = LABEL_FONT;
    if (this.labelFor !== label) {
      this.labelFor = label;
      this.labelWidth = Math.ceil(ctx.measureText(label).width);
    }
    const x = Math.round(this.hx + 26);
    const y = Math.round(this.hy - 11);
    const w = this.labelWidth + 14;
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 2, y + 2, w, 22);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, 22);
    ctx.fillStyle = '#0b0b0b';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 7, y + 12);
  }
}
