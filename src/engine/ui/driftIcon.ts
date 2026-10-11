import { ticker } from '../core/Ticker';
import { drawIconDigits, FLICKER_MS } from '../cursor/drawIcon';
import { ICONS, type IconName } from '../cursor/pixelIcons';
import { makeAtlas } from '../glyph/drawGlyph';
import type { GlyphAtlas } from '../glyph/GlyphAtlas';

const CELL_W = 6;
const CELL_H = 10;
/** The icon keeps flickering this long after the last scroll, then it rests. */
const ACTIVE_MS = 1400;
/** Margin kept free on the sides and the top/bottom of the screen, in CSS px. */
const EDGE = 28;
/** At the bottom of the page the icon stops above the footer line instead of on top of it. */
const FOOTER_CLEARANCE = 96;
const DIM = 3;

/**
 * Where on the screen the drifting icon sits for a page `progress` (0 top, 1 bottom): a diagonal from the top-left
 * to the bottom-right corner with a slow sway, so the icon crosses the whole page while you read it.
 */
export function driftPosition(
  progress: number,
  viewportWidth: number,
  viewportHeight: number,
  iconWidth: number,
  iconHeight: number,
): { x: number; y: number } {
  const t = Math.min(1, Math.max(0, progress));
  const spanX = Math.max(0, viewportWidth - iconWidth - 2 * EDGE);
  const spanY = Math.max(0, viewportHeight - iconHeight - EDGE - 64 - FOOTER_CLEARANCE);
  const sway = Math.sin(t * Math.PI * 6) * 14;
  return { x: EDGE + spanX * t + sway, y: EDGE + 64 + spanY * t };
}

/**
 * A dim icon made of digits that drifts from the top-left to the bottom-right of the screen as the page scrolls
 * and shows the icon of the current section. It is redrawn only while you scroll (and for a moment after), at the
 * flicker rate; at rest it costs nothing. Decoration only.
 */
export class DriftIcon {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlas: GlyphAtlas;
  private readonly dpr: number;
  private readonly width: number;
  private readonly height: number;
  private icon: IconName = 'smile';
  private lastScroll = -Infinity;
  private lastTick = -1;
  private unsubscribe: (() => void) | null = null;
  private frame = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.atlas = makeAtlas(CELL_W, CELL_H, this.dpr);
    const rows = ICONS.heart.rows;
    this.width = rows[0]!.length * CELL_W;
    this.height = rows.length * CELL_H;
    canvas.width = Math.round(this.width * this.dpr);
    canvas.height = Math.round(this.height * this.dpr);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.place);
    this.place();
    this.draw(0);
  }

  setIcon(icon: IconName): void {
    if (icon === this.icon) return;
    this.icon = icon;
    this.draw(Math.max(0, this.lastTick));
  }

  destroy(): void {
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.place);
    cancelAnimationFrame(this.frame);
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private readonly onScroll = (): void => {
    this.lastScroll = performance.now();
    if (!this.frame) this.frame = requestAnimationFrame(this.place);
    if (!this.unsubscribe) {
      this.unsubscribe = ticker.add(() => {
        const now = performance.now();
        const tick = Math.floor(now / FLICKER_MS);
        if (tick !== this.lastTick) this.draw(tick);
        if (now - this.lastScroll > ACTIVE_MS) {
          this.unsubscribe?.();
          this.unsubscribe = null;
        }
      });
    }
  };

  private readonly place = (): void => {
    this.frame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    const { x, y } = driftPosition(
      progress,
      window.innerWidth,
      window.innerHeight,
      this.width,
      this.height,
    );
    this.canvas.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  private draw(tick: number): void {
    this.lastTick = tick;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawIconDigits(ctx, this.atlas, ICONS[this.icon], 0, 0, {
      cellW: CELL_W,
      cellH: CELL_H,
      scale: this.dpr,
      tick,
      toneShift: DIM,
    });
  }
}
