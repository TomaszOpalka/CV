import { ticker } from '../core/Ticker';
import { resolveCursorTarget, sameTarget, type CursorTarget } from '../ui/cursorTarget';
import { waveColor, type CursorTheme } from './cursorPalette';
import { ICONS } from './pixelIcons';
import { PixelTrail } from './PixelTrail';

/** Size of one cursor square in CSS px. */
const CELL = 6;
const ICON_CELL = 4;
const FOLLOW_RATE = 28;
/** Colour-wave speed: a new colour every ~30 px of travel, plus a slow drift in time. */
const PHASE_PER_PX = 0.034;
const PHASE_PER_SECOND = 1.4;
/** After this long without moving the head turns into its icon. */
const REST_MS = 320;
const MOVING_PX_PER_SECOND = 30;
const OUTLINE = '#0b0b0b';
const OUTLINE_OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, 0],
  [2, 0],
  [0, -2],
  [0, 2],
];
const LABEL_FONT = '600 11px ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Offsets (in cells) of the small plus-shaped blob that leads the trail. */
const BLOB: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0, 0],
  [-1, 0, 1],
  [1, 0, 1],
  [0, -1, 2],
  [0, 1, 2],
];

/**
 * The pixel cursor: a full-screen, click-through canvas with a small blob of coloured squares that follows
 * the pointer and leaves a short, fast-fading trail of falling squares. The colours travel through a wave
 * as you move. At rest, or over links and cards, the blob turns into a pixel-art icon. One shared ticker
 * subscription; it sleeps when the pointer has left and the trail is gone.
 */
export class CursorController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly trail = new PixelTrail();
  private unsubscribe: (() => void) | null = null;
  private width = 0;
  private height = 0;

  private px = -100;
  private py = -100;
  private hx = -100;
  private hy = -100;
  private lastEmitX = -100;
  private lastEmitY = -100;
  private inside = false;
  private pressed = false;
  private phase = 0;
  private restMs = 0;
  private resolveMs = 0;
  private target: CursorTarget = { kind: 'default', icon: 'heart', theme: 'negative', label: '' };
  private labelWidth = 0;
  private labelFor = '';
  private dirty: [number, number, number, number] | null = null;
  private bounds: [number, number, number, number] = [0, 0, 0, 0];

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
    this.dirty = null;
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
      this.hx = this.lastEmitX = this.px;
      this.hy = this.lastEmitY = this.py;
    }
    const next = resolveCursorTarget(event.target instanceof Element ? event.target : null);
    if (!sameTarget(this.target, next)) this.target = next;
    this.wake();
  };

  private readonly onDown = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    this.pressed = true;
    // A small burst of squares around the pointer.
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      this.trail.emit(
        this.hx + Math.cos(angle) * CELL * 1.5,
        this.hy + Math.sin(angle) * CELL * 1.5,
        this.phase + i * 0.4,
      );
    }
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
    const speed = moved / step;

    if (speed > MOVING_PX_PER_SECOND) {
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

    this.emitAlong();
    const alive = this.trail.step(step);
    this.draw();

    if (!this.inside && alive === 0) {
      this.clearDirty();
      this.unsubscribe?.();
      this.unsubscribe = null;
    }
  }

  /** Drop squares along the way the head travelled since the last one. */
  private emitAlong(): void {
    if (!this.inside) return;
    const dx = this.hx - this.lastEmitX;
    const dy = this.hy - this.lastEmitY;
    const distance = Math.hypot(dx, dy);
    if (distance < CELL) return;
    const count = Math.min(6, Math.floor(distance / CELL));
    for (let i = 1; i <= count; i++) {
      const t = i / count;
      const jitter = (Math.random() - 0.5) * CELL * 1.2;
      this.trail.emit(
        this.lastEmitX + dx * t + jitter,
        this.lastEmitY + dy * t + jitter * 0.6,
        this.phase - (1 - t) * distance * PHASE_PER_PX,
      );
    }
    this.lastEmitX = this.hx;
    this.lastEmitY = this.hy;
  }

  private clearDirty(): void {
    const d = this.dirty;
    if (!d) return;
    this.ctx.clearRect(d[0], d[1], d[2] - d[0], d[3] - d[1]);
    this.dirty = null;
  }

  private cover(x0: number, y0: number, x1: number, y1: number): void {
    const b = this.bounds;
    if (x0 < b[0]) b[0] = x0;
    if (y0 < b[1]) b[1] = y0;
    if (x1 > b[2]) b[2] = x1;
    if (y1 > b[3]) b[3] = y1;
  }

  private draw(): void {
    this.clearDirty();
    const ctx = this.ctx;
    const theme: CursorTheme = this.target.theme;
    this.bounds = [this.width, this.height, 0, 0];

    // Trail: falling squares that shrink and cool off.
    const trail = this.trail;
    for (let i = 0; i < trail.capacity; i++) {
      if (!trail.isAlive(i)) continue;
      const t = trail.progress(i);
      const size = Math.max(2, Math.round(CELL * (1 - 0.65 * t)));
      const x = Math.round(trail.x[i]! / CELL) * CELL + (CELL - size) / 2;
      const y = Math.round(trail.y[i]! / 2) * 2;
      ctx.globalAlpha = 1 - t * t;
      ctx.fillStyle = waveColor(theme, trail.phase[i]!);
      ctx.fillRect(x, y, size, size);
      this.cover(x, y, x + size, y + size);
    }
    ctx.globalAlpha = 1;

    if (!this.inside) {
      this.finishDirty();
      return;
    }

    const showIcon = this.restMs > REST_MS || this.target.kind !== 'default';
    if (showIcon && this.target.kind !== 'text') this.drawIcon(theme);
    else if (this.target.kind === 'text') this.drawBeam(theme);
    else this.drawBlob(theme);
    if (this.target.label) this.drawLabel();
    this.finishDirty();
  }

  private finishDirty(): void {
    const b = this.bounds;
    if (b[2] > b[0] && b[3] > b[1]) this.dirty = [b[0] - 2, b[1] - 2, b[2] + 4, b[3] + 4];
  }

  private drawBlob(theme: CursorTheme): void {
    const ctx = this.ctx;
    const size = this.pressed ? CELL - 2 : CELL + 1;
    const cx = Math.round(this.hx / CELL) * CELL;
    const cy = Math.round(this.hy / CELL) * CELL;
    // A dark outline first, so the blob reads on top of bright squares as well.
    ctx.fillStyle = OUTLINE;
    for (const [ox, oy] of BLOB) {
      ctx.fillRect(
        cx + ox * CELL - size / 2 - 2,
        cy + oy * CELL - size / 2 - 2,
        size + 4,
        size + 4,
      );
    }
    for (const [ox, oy, shift] of BLOB) {
      const x = cx + ox * CELL - size / 2;
      const y = cy + oy * CELL - size / 2;
      ctx.fillStyle = waveColor(theme, this.phase + shift);
      ctx.fillRect(x, y, size, size);
      this.cover(x - 2, y - 2, x + size + 2, y + size + 2);
    }
  }

  private drawIcon(theme: CursorTheme): void {
    const rows = ICONS[this.target.icon];
    this.drawBitmap(rows, theme);
  }

  private drawBeam(theme: CursorTheme): void {
    this.drawBitmap(ICONS.beam, theme);
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
    this.cover(left - 2, top - 2, left + width + 2, top + height + 2);
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
    this.cover(x, y, x + w + 2, y + 24);
  }
}
