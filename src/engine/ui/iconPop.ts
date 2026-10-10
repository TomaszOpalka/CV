import { ticker } from '../core/Ticker';
import { drawIconDigits, FLICKER_MS } from '../cursor/drawIcon';
import { ICONS, type IconName } from '../cursor/pixelIcons';
import { makeAtlas } from '../glyph/drawGlyph';
import type { GlyphAtlas } from '../glyph/GlyphAtlas';

/** One digit cell of the pop-up icon in CSS px (smaller than the mouse cursor's). */
const CELL_W = 6;
const CELL_H = 10;
/** How long the icon stays on screen (matches the CSS animation). */
export const POP_MS = 900;

/**
 * The touch counterpart of the cursor icon: draws the icon of the section you scrolled into on a small canvas
 * and keeps its digits flickering while it is visible. The canvas is sized to the icon (13 x 9 digits).
 */
export class IconPop {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlas: GlyphAtlas;
  private readonly dpr: number;
  private unsubscribe: (() => void) | null = null;
  private icon: IconName = 'heart';
  private elapsed = 0;
  private lastTick = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.atlas = makeAtlas(CELL_W, CELL_H, this.dpr);
    const rows = ICONS.heart.rows;
    canvas.width = Math.round(rows[0]!.length * CELL_W * this.dpr);
    canvas.height = Math.round(rows.length * CELL_H * this.dpr);
  }

  /** Show `icon` now (restarts the flicker; the fade in and out is CSS). */
  show(icon: IconName): void {
    this.icon = icon;
    this.elapsed = 0;
    this.lastTick = -1;
    this.draw(0);
    if (!this.unsubscribe) {
      this.unsubscribe = ticker.add((deltaMs) => {
        this.elapsed += deltaMs;
        const tick = Math.floor(this.elapsed / FLICKER_MS);
        if (tick !== this.lastTick) this.draw(tick);
        if (this.elapsed > POP_MS) this.stop();
      });
    }
  }

  destroy(): void {
    this.stop();
  }

  private stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private draw(tick: number): void {
    this.lastTick = tick;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawIconDigits(ctx, this.atlas, ICONS[this.icon], 0, 0, {
      cellW: CELL_W,
      cellH: CELL_H,
      scale: this.dpr,
      tick,
    });
  }
}
