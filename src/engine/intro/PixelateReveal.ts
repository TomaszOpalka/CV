import type { Crop } from '../glyph/portrait';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Size of the first "pixels", in CSS px. */
const START_PIXEL = 30;
/** Below this block size the last frame is drawn straight from the source image. */
const FINAL_PIXEL = 1.05;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Paints a photo with shrinking "pixels" (30 px blocks -> 1 px), fading it in at the same time.
 * Everything is computed in device pixels so the last frame matches the DOM <img> that replaces it:
 * the final frame is drawn straight from the full-resolution image into a pixel-aligned rectangle.
 * Uses one scratch canvas allocated once, so the animation never allocates per frame.
 */
export class PixelateReveal {
  private readonly image: CanvasImageSource;
  private readonly crop: Crop;
  private readonly dpr: number;
  /** Destination rectangle in device pixels, rounded to whole pixels. */
  private readonly dx: number;
  private readonly dy: number;
  private readonly dw: number;
  private readonly dh: number;
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchCtx: CanvasRenderingContext2D;

  constructor(image: CanvasImageSource, crop: Crop, rect: Rect, dpr: number) {
    this.image = image;
    this.crop = crop;
    this.dpr = dpr;
    this.dx = Math.round(rect.x * dpr);
    this.dy = Math.round(rect.y * dpr);
    this.dw = Math.max(1, Math.round(rect.w * dpr));
    this.dh = Math.max(1, Math.round(rect.h * dpr));
    this.scratch = document.createElement('canvas');
    this.scratch.width = this.dw;
    this.scratch.height = this.dh;
    const ctx = this.scratch.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.scratchCtx = ctx;
  }

  /** `progress` runs 0 -> 1. */
  draw(ctx: CanvasRenderingContext2D, progress: number): void {
    const p = Math.min(1, Math.max(0, progress));
    const block = 1 + (START_PIXEL - 1) * (1 - easeOutCubic(p));
    const { crop, dx, dy, dw, dh } = this;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = Math.min(1, p * 2.2);

    if (block <= FINAL_PIXEL) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.image, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh);
    } else {
      const sw = Math.min(dw, Math.max(1, Math.round(dw / (block * this.dpr))));
      const sh = Math.min(dh, Math.max(1, Math.round(dh / (block * this.dpr))));
      this.scratchCtx.clearRect(0, 0, sw, sh);
      this.scratchCtx.imageSmoothingEnabled = true;
      this.scratchCtx.drawImage(this.image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.scratch, 0, 0, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
  }
}
