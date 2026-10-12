import { drawGlyph, makeAtlas } from '../glyph/drawGlyph';
import type { GlyphAtlas } from '../glyph/GlyphAtlas';
import { CELL_ASPECT } from '../glyph/portrait';
import {
  buildPath,
  countdownDigit,
  hasRoom,
  headDistance,
  SPACING,
  threadTone,
  type ThreadAnchors,
  type ThreadPath,
} from './threadPath';

const CELL_H = 12;
const CELL_W = CELL_H * CELL_ASPECT;
const MAX_DPR = 1.5;
/** The arrow at the end appears when the head is this close to the end of the thread. */
const ARROW_FROM = 4 * SPACING;

/**
 * A thread of digits down the left margin of the page, tied to the scroll like a progress bar. The head of the
 * thread sits at the scroll position: right behind it the digits count down 9, 8, 7 ... 0, and everything
 * behind that is a faint trail of zeros that stays on the page. Scrolling up takes the head (and the digits) back.
 * At the bottom it ends with an arrow pointing at the e-mail address.
 *
 * The path is measured from the page (hero, content column, e-mail) and again whenever the page changes size. Only
 * the part of the thread that is on screen is drawn, and only when the page scrolls. Decoration only.
 */
export class ThreadLine {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private atlas: GlyphAtlas | null = null;
  private path: ThreadPath | null = null;
  private dpr = 1;
  private frame = 0;
  private readonly observer: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.observer = new ResizeObserver(() => this.schedule(true));
    this.observer.observe(document.body);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    window.addEventListener('resize', this.onResize);
    this.measure();
    this.draw();
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    window.removeEventListener('scroll', this.onScroll);
    window.removeEventListener('resize', this.onResize);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private pendingMeasure = false;

  private readonly onScroll = (): void => this.schedule(false);
  private readonly onResize = (): void => this.schedule(true);

  private schedule(measure: boolean): void {
    this.pendingMeasure ||= measure;
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.pendingMeasure) {
        this.pendingMeasure = false;
        this.measure();
      }
      this.draw();
    });
  }

  /** Reads the page (hero, content column, e-mail) and builds the path. */
  private measure(): void {
    const about = document.getElementById('about');
    const header = document.querySelector('#contact header');
    const email = document.querySelector('#contact a[href^="mailto:"]');
    if (!about || !header || !email) {
      this.path = null;
      return;
    }
    const scrollY = window.scrollY;
    const emailRect = email.getBoundingClientRect();
    const anchors: ThreadAnchors = {
      contentLeft: header.getBoundingClientRect().left,
      startY: about.getBoundingClientRect().top + scrollY + 110,
      emailLeft: emailRect.left,
      emailY: emailRect.top + scrollY + emailRect.height / 2,
    };
    this.path = hasRoom(anchors) ? buildPath(anchors) : null;

    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const width = Math.round(window.innerWidth * this.dpr);
    const height = Math.round(window.innerHeight * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height || !this.atlas) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.atlas = makeAtlas(CELL_W, CELL_H, this.dpr);
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const atlas = this.atlas;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const path = this.path;
    if (!path || !atlas) return;

    const scrollY = window.scrollY;
    const viewport = window.innerHeight;
    const max = document.documentElement.scrollHeight - viewport;
    const head = headDistance(scrollY, max, path.length);
    const scale = this.dpr;
    const gw = atlas.glyphW;
    const gh = atlas.glyphH;

    for (let i = 0; i < path.count; i++) {
      const s = i * SPACING;
      if (s > head) break;
      const y = path.y[i]! - scrollY;
      if (y < -CELL_H || y > viewport + CELL_H) continue;
      const behind = (head - s) / SPACING;
      drawGlyph(
        ctx,
        atlas,
        countdownDigit(behind),
        0,
        threadTone(behind),
        path.x[i]! * scale - gw / 2,
        y * scale - gh / 2,
      );
    }

    if (head >= path.length - ARROW_FROM) this.drawArrow(path, scrollY, viewport, atlas);
  }

  /** The arrowhead: two short rows of digits sweeping back from the tip, pointing right at the e-mail. */
  private drawArrow(path: ThreadPath, scrollY: number, viewport: number, atlas: GlyphAtlas): void {
    const y0 = path.tipY - scrollY;
    if (y0 < -40 || y0 > viewport + 40) return;
    const scale = this.dpr;
    const gw = atlas.glyphW;
    const gh = atlas.glyphH;
    const angle = (45 * Math.PI) / 180;
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 3; k++) {
        const dx = -Math.cos(angle) * k * 14;
        const dy = side * Math.sin(angle) * k * 14;
        drawGlyph(
          this.ctx,
          atlas,
          (k * 3 + (side > 0 ? 1 : 0)) % 10,
          0,
          5,
          (path.tipX + dx) * scale - gw / 2,
          (y0 + dy) * scale - gh / 2,
        );
      }
    }
    drawGlyph(this.ctx, atlas, 0, 0, 6, path.tipX * scale - gw / 2, y0 * scale - gh / 2);
  }
}
