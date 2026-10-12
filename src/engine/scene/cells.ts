import type { GlyphField } from '../glyph/GlyphField';
import { brightnessToGlyph } from '../glyph/portrait';
import { dragFactor } from '../glyph/forces';

/** Cells dimmer than this stay empty. */
const OFF_BELOW = 0.06;
/** Brightness gain: vector lines are thin, so they are boosted to read as bright digits. */
const GAIN = 1.9;
/** Dim areas are pushed down and bright lines up, which makes outlines stand out from fills. */
const CURVE = 1.35;
/** How far (in ramp steps) a digit may stray from the exact match, so flat areas do not turn into one repeated digit. */
const GLYPH_JITTER = 2.2;
/** Share of cells that re-roll their digit every second, so the picture keeps "shimmering". */
const SHIMMER_PER_SECOND = 1.1;

/**
 * Turns a brightness map into digits: bright cells get dense digits at a high tone, dark ones
 * stay empty. `noise` holds one stable random number per cell (in -0.5..0.5) that picks among
 * similar digits; a few of them are re-rolled every call to make the picture shimmer.
 */
export class CellShader {
  private readonly noise: Float32Array;
  private carry = 0;

  constructor(
    private readonly count: number,
    private readonly rng: () => number = Math.random,
  ) {
    this.noise = new Float32Array(count);
    for (let i = 0; i < count; i++) this.noise[i] = rng() - 0.5;
  }

  /**
   * `palette` holds the colour of every cell. `locked` marks cells that hold a finished picture (the portrait): they skip the contrast boost.
   * Cells that turn dark keep a fading trail for `trailRate` (1/s; 0 = switch off at once), so the
   * digits left over from the explosion melt away instead of vanishing in one frame.
   */
  shade(
    field: GlyphField,
    lum: Float32Array,
    palette: Uint8Array,
    ramp: Uint8Array,
    dt: number,
    locked: Uint8Array | null = null,
    trailRate = 0,
  ): void {
    this.carry += this.count * SHIMMER_PER_SECOND * dt;
    const rerolls = Math.floor(this.carry);
    this.carry -= rerolls;
    for (let k = 0; k < rerolls; k++) {
      this.noise[Math.floor(this.rng() * this.count)] = this.rng() - 0.5;
    }

    const top = field.toneLevels - 1;
    const { glyph, tone } = field;
    const fieldPalette = field.palette;
    const noise = this.noise;
    const trail = trailRate > 0 ? dragFactor(trailRate, dt) : 0;
    for (let i = 0; i < this.count; i++) {
      const b = lum[i]!;
      if (b < OFF_BELOW) {
        tone[i] = tone[i]! * trail;
        continue;
      }
      let v: number;
      if (locked !== null && locked[i]) {
        v = b > 1 ? 1 : b;
      } else {
        const g = b * GAIN;
        v = g >= 1 ? 1 : Math.pow(g, CURVE);
      }
      tone[i] = 1 + (top - 1) * v;
      fieldPalette[i] = palette[i]!;
      glyph[i] = brightnessToGlyph(v, ramp, noise[i]!, GLYPH_JITTER);
    }
  }
}
