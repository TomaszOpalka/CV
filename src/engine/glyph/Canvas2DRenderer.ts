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

  /** `maxRow` limits drawing to the top rows (used for the boot cascade). */
  drawField(field: GlyphField, atlas: GlyphAtlas, maxRow: number): void {
    const ctx = this.ctx;
    const dpr = this.dpr;
    const gw = atlas.glyphW;
    const gh = atlas.glyphH;
    const halfW = gw / 2;
    const halfH = gh / 2;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const top = atlas.toneLevels - 1;
    const sheet = atlas.canvas;
    const { x, y, tone, glyph, rowOf } = field;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < field.count; i++) {
      if (rowOf[i]! > maxRow) continue;
      let level = (tone[i]! + 0.5) | 0;
      if (level <= 0) continue;
      if (level > top) level = top;
      const dx = (x[i]! * dpr - halfW + 0.5) | 0;
      const dy = (y[i]! * dpr - halfH + 0.5) | 0;
      if (dx < -gw || dx > width || dy < -gh || dy > height) continue;
      ctx.drawImage(sheet, glyph[i]! * gw, level * gh, gw, gh, dx, dy, gw, gh);
    }
  }
}
