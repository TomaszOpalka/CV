import { classifyColor } from '../glyph/palette';

/**
 * The bridge between vector drawing and the digit grid. A scene is drawn with ordinary canvas
 * calls (in CSS px) onto an off-screen canvas at twice the grid resolution. `sample` then shrinks
 * it to one pixel per grid cell and reads the brightness of every cell.
 * The shrink is a plain 2x2 average done by the canvas itself, so only a tiny image is read back.
 */
export class SceneRaster {
  readonly ctx: CanvasRenderingContext2D;
  readonly canvas: HTMLCanvasElement;
  private readonly small: HTMLCanvasElement;
  private readonly smallCtx: CanvasRenderingContext2D;

  constructor(
    readonly cols: number,
    readonly rows: number,
    readonly cellW: number,
    readonly cellH: number,
    readonly supersample = 2,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = cols * supersample;
    this.canvas.height = rows * supersample;
    const ctx = this.canvas.getContext('2d');
    this.small = document.createElement('canvas');
    this.small.width = cols;
    this.small.height = rows;
    const smallCtx = this.small.getContext('2d', { willReadFrequently: true });
    if (!ctx || !smallCtx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    this.smallCtx = smallCtx;
    this.smallCtx.imageSmoothingEnabled = true;
  }

  /** Clears to black and sets a transform so the scene can be drawn in CSS px of the visible canvas. */
  begin(): CanvasRenderingContext2D {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.supersample / this.cellW, 0, 0, this.supersample / this.cellH, 0, 0);
    return ctx;
  }

  /**
   * Brightness 0..1 and palette of every grid cell, row by row, written into `lum` and `palette`
   * (length cols * rows). Coloured strokes (see `classifyColor`) tint the digits; everything else is white.
   */
  sample(lum: Float32Array, palette: Uint8Array): void {
    const { cols, rows } = this;
    this.smallCtx.drawImage(this.canvas, 0, 0, cols, rows);
    const data = this.smallCtx.getImageData(0, 0, cols, rows).data;
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const r = data[i * 4]!;
      const g = data[i * 4 + 1]!;
      const b = data[i * 4 + 2]!;
      lum[i] = Math.max(r, g, b) / 255;
      palette[i] = classifyColor(r, g, b);
    }
  }
}
