import type { GlyphAtlas } from './GlyphAtlas';
import type { GlyphField } from './GlyphField';

/** Draws a GlyphField with one `drawImage` per visible glyph. Works in device pixels. */
export class Canvas2DRenderer {
  readonly ctx: CanvasRenderingContext2D;
  dpr = 1;
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.dpr = dpr;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.ctx.imageSmoothingEnabled = false;
  }

  clear(): void {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * `maxRow` limits drawing to the top rows (used for the boot cascade). `glyphScale` enlarges every
   * glyph around its centre (the zoom into the camera) and `shakeX/shakeY` (CSS px) shift the whole
   * picture for the camera shake.
   */
  drawField(
    field: GlyphField,
    atlas: GlyphAtlas,
    maxRow: number,
    glyphScale = 1,
    shakeX = 0,
    shakeY = 0,
  ): void {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const gw = atlas.glyphW;
    const gh = atlas.glyphH;
    const dw = gw * glyphScale;
    const dh = gh * glyphScale;
    const halfW = dw / 2;
    const halfH = dh / 2;
    const offX = shakeX * dpr + 0.5;
    const offY = shakeY * dpr + 0.5;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const top = atlas.toneLevels - 1;
    const sheet = atlas.canvas;
    const { x, y, tone, glyph, rowOf } = field;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = glyphScale > 1.4;
    for (let i = 0; i < field.count; i++) {
      if (rowOf[i]! > maxRow) continue;
      let level = (tone[i]! + 0.5) | 0;
      if (level <= 0) continue;
      if (level > top) level = top;
      const dx = (x[i]! * dpr - halfW + offX) | 0;
      const dy = (y[i]! * dpr - halfH + offY) | 0;
      if (dx < -dw || dx > width || dy < -dh || dy > height) continue;
      ctx.drawImage(sheet, glyph[i]! * gw, level * gh, gw, gh, dx, dy, dw, dh);
    }
  }
}
