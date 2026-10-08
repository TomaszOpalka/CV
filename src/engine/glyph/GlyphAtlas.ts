import { rampFromCoverage } from './portrait';

/**
 * Pre-rendered sprite sheet of the digits 0-9 at several brightness levels.
 * Columns are digits, rows are tone levels. Drawing a glyph is then one `drawImage` call.
 * Sizes are in device pixels so glyphs stay crisp on high-DPI screens.
 */
export class GlyphAtlas {
  readonly canvas: HTMLCanvasElement;
  readonly glyphW: number;
  readonly glyphH: number;
  readonly toneLevels: number;
  /** Digits ordered from the lightest to the densest. */
  readonly ramp: Uint8Array;

  constructor(cellW: number, cellH: number, dpr: number, toneLevels: number, fontFamily: string) {
    this.toneLevels = toneLevels;
    this.glyphW = Math.max(2, Math.round(cellW * dpr));
    this.glyphH = Math.max(3, Math.round(cellH * dpr));

    const canvas = document.createElement('canvas');
    canvas.width = this.glyphW * 10;
    canvas.height = this.glyphH * toneLevels;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas is not available');

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.round(this.glyphH * 0.9)}px ${fontFamily}`;

    for (let tone = 0; tone < toneLevels; tone++) {
      const lum = Math.round(255 * (0.16 + 0.84 * (tone / (toneLevels - 1))));
      ctx.fillStyle = `rgb(${lum},${lum},${lum})`;
      for (let digit = 0; digit < 10; digit++) {
        ctx.fillText(
          String(digit),
          digit * this.glyphW + this.glyphW / 2,
          tone * this.glyphH + this.glyphH / 2 + 1,
        );
      }
    }

    // Measure how much "ink" each digit has (brightest row) to build the brightness -> digit ramp.
    const coverage: number[] = [];
    for (let digit = 0; digit < 10; digit++) {
      const data = ctx.getImageData(
        digit * this.glyphW,
        (toneLevels - 1) * this.glyphH,
        this.glyphW,
        this.glyphH,
      ).data;
      let sum = 0;
      for (let p = 3; p < data.length; p += 4) sum += data[p]!;
      coverage.push(sum);
    }
    this.ramp = rampFromCoverage(coverage);
    this.canvas = canvas;
  }
}
