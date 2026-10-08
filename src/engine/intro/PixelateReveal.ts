import type { Crop } from '../glyph/portrait';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const START_PIXEL = 30;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Paints a photo with shrinking "pixels" (30 px blocks -> 1 px), fading it in at the same time.
 * Uses one small scratch canvas that is allocated once, so the animation never allocates per frame.
 */
export class PixelateReveal {
  private readonly image: CanvasImageSource;
  private readonly crop: Crop;
  private readonly rect: Rect;
  private readonly dpr: number;
  private readonly scratch: HTMLCanvasElement;
  private readonly scratchCtx: CanvasRenderingContext2D;

  constructor(image: CanvasImageSource, crop: Crop, rect: Rect, dpr: number) {
    this.image = image;
    this.crop = crop;
    this.rect = rect;
    this.dpr = dpr;
    this.scratch = document.createElement('canvas');
    this.scratch.width = Math.max(1, Math.ceil(rect.w));
    this.scratch.height = Math.max(1, Math.ceil(rect.h));
    const ctx = this.scratch.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.scratchCtx = ctx;
  }

  /** `progress` runs 0 -> 1. */
  draw(ctx: CanvasRenderingContext2D, progress: number): void {
    const p = Math.min(1, Math.max(0, progress));
    const size = 1 + (START_PIXEL - 1) * (1 - easeOutCubic(p));
    const { rect, crop, scratch, scratchCtx } = this;
    const sw = Math.min(scratch.width, Math.max(1, Math.round(rect.w / size)));
    const sh = Math.min(scratch.height, Math.max(1, Math.round(rect.h / size)));

    scratchCtx.clearRect(0, 0, sw, sh);
    scratchCtx.imageSmoothingEnabled = true;
    scratchCtx.drawImage(this.image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, sw, sh);

    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalAlpha = Math.min(1, p * 2.2);
    ctx.imageSmoothingEnabled = size < 1.5;
    ctx.drawImage(scratch, 0, 0, sw, sh, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
}
