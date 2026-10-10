import { ticker } from '../core/Ticker';
import { drawGlyph, makeAtlas } from '../glyph/drawGlyph';
import type { GlyphAtlas } from '../glyph/GlyphAtlas';
import { FIRE, WHITE } from '../glyph/palette';
import { CELL_ASPECT } from '../glyph/portrait';
import { HEAT_RAMP } from '../pixels/heatPalette';
import { resolveCursorTarget, sameTarget, type CursorTarget } from '../ui/cursorTarget';
import { drawIconDigits, FLICKER_MS } from './drawIcon';
import { HeatBrush } from './HeatBrush';
import { ICONS, type PixelIcon } from './pixelIcons';

/** One digit cell of the cursor, in CSS px (the same proportions as the intro's digits). */
const CELL_H = 14;
const CELL_W = CELL_H * CELL_ASPECT;
/** Radius of the comet (outer edge) in CSS px: about 12 digits across. */
const BRUSH_RADIUS = 52;
const FOLLOW_RATE = 34;
/** After this long without moving the cursor turns into its icon. */
const REST_MS = 280;
const MOVING_PX_PER_SECOND = 30;
const LABEL_FONT = '600 11px ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Offsets (in cells) of the small plus-shaped cluster used over the pixel field, where the field is the comet. */
const CLUSTER: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/**
 * The cursor, drawn in the digits of the intro. A full-screen, click-through canvas: moving the pointer paints
 * a comet of digits (orange-hot core, white, greys at the edge) that cools and vanishes within about half a
 * second. At rest, or over links and cards, the cursor turns into a large icon made of digits (each icon has
 * its own colour). Over the pixel field only a small cluster follows the pointer, because the field itself
 * lights up there. One shared ticker subscription; it sleeps when the pointer has left and the comet is gone.
 */
export class CursorController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private brush: HeatBrush | null = null;
  private atlas: GlyphAtlas | null = null;
  private unsubscribe: (() => void) | null = null;
  private dpr = 1;
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
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private readonly resize = (): void => {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.brush = new HeatBrush(
      Math.ceil(this.width / CELL_W),
      Math.ceil(this.height / CELL_H),
      CELL_W,
      CELL_H,
    );
    this.atlas = makeAtlas(CELL_W, CELL_H, this.dpr);
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

    if (moved / step > MOVING_PX_PER_SECOND) this.restMs = 0;
    else this.restMs += step * 1000;

    // Scrolling or a section changing under a still pointer changes the target without a pointer event.
    this.resolveMs += step * 1000;
    if (this.inside && this.resolveMs > 120) {
      this.resolveMs = 0;
      const next = resolveCursorTarget(document.elementFromPoint(this.px, this.py));
      if (!sameTarget(this.target, next)) this.target = next;
    }

    const brush = this.brush;
    if (brush && this.inside && this.target.theme !== 'heat' && moved > 0.1) {
      brush.stampSegment(this.lastX, this.lastY, this.hx, this.hy, BRUSH_RADIUS);
    }
    this.lastX = this.hx;
    this.lastY = this.hy;
    const lit = brush ? brush.step(step) : 0;

    this.draw();

    if (!this.inside && lit === 0) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.unsubscribe?.();
      this.unsubscribe = null;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBrush();
    if (!this.inside) return;

    const { kind, icon, theme, label } = this.target;
    const showIcon = this.restMs > REST_MS || kind !== 'default';
    if (kind === 'text') this.drawIcon(ICONS.beam);
    else if (showIcon) this.drawIcon(ICONS[icon]);
    else if (theme === 'heat') this.drawCluster();
    if (label) this.drawLabel();
  }

  /** The comet: one digit per lit cell, coloured by the heat ramp. */
  private drawBrush(): void {
    const brush = this.brush;
    const atlas = this.atlas;
    const bounds = brush?.bounds();
    if (!brush || !atlas || !bounds) return;
    const scale = this.dpr;
    for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
      for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
        const i = r * brush.cols + c;
        const bucket = brush.bucket(i);
        if (bucket < 0) continue;
        const shade = HEAT_RAMP[bucket]!;
        drawGlyph(
          this.ctx,
          atlas,
          brush.glyph[i]!,
          shade.palette,
          shade.tone,
          c * CELL_W * scale,
          r * CELL_H * scale,
        );
      }
    }
  }

  private drawCluster(): void {
    const atlas = this.atlas;
    if (!atlas) return;
    const tick = Math.floor(performance.now() / FLICKER_MS);
    const cx = Math.round(this.hx / CELL_W) * CELL_W;
    const cy = Math.round(this.hy / CELL_H) * CELL_H;
    CLUSTER.forEach(([ox, oy], n) => {
      const palette = n === 0 ? FIRE : WHITE;
      drawGlyph(
        this.ctx,
        atlas,
        (tick + n * 3) % 10,
        palette,
        7,
        (cx + ox * CELL_W - CELL_W / 2) * this.dpr,
        (cy + oy * CELL_H - CELL_H / 2) * this.dpr,
      );
    });
  }

  /** An icon made of digits, centred on the pointer and snapped to the digit grid. */
  private drawIcon(icon: PixelIcon): void {
    const atlas = this.atlas;
    if (!atlas) return;
    const { rows } = icon;
    const left = Math.round((this.hx - (rows[0]!.length * CELL_W) / 2) / CELL_W) * CELL_W;
    const top = Math.round((this.hy - (rows.length * CELL_H) / 2) / CELL_H) * CELL_H;
    drawIconDigits(this.ctx, atlas, icon, left, top, {
      cellW: CELL_W,
      cellH: CELL_H,
      scale: this.dpr,
      tick: Math.floor(performance.now() / FLICKER_MS),
      pressed: this.pressed,
    });
  }

  private drawLabel(): void {
    const ctx = this.ctx;
    const label = this.target.label;
    const s = this.dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.font = LABEL_FONT;
    if (this.labelFor !== label) {
      this.labelFor = label;
      this.labelWidth = Math.ceil(ctx.measureText(label).width);
    }
    const x = Math.round(this.hx + 62);
    const y = Math.round(this.hy - 11);
    const w = this.labelWidth + 14;
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 2, y + 2, w, 22);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, w, 22);
    ctx.fillStyle = '#0b0b0b';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 7, y + 12);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
