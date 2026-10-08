import type { GlyphField } from '../glyph/GlyphField';
import { GREEN } from '../glyph/palette';
import { CellShader } from './cells';
import { MatrixRain } from './matrixRain';
import { lerp, ramp } from './math';
import { SceneRaster } from './SceneRaster';
import { ACT_LENGTHS, ACT_START, actAt, type ActName } from './timeline';
import { World } from './World';

export interface SequenceGrid {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
}

/** When, inside the last act, the rain starts to settle into the portrait (seconds) and how long it takes. */
const WAVE_START = 0.9;
const WAVE_SECONDS = ACT_LENGTHS.matrix - WAVE_START - 0.1;
/** The digits left over from the click explosion melt away over this long (seconds). */
const LEFTOVER_SECONDS = 0.8;
/** The big explosion throws the digits away; this long after it they fly home for the Matrix rain. */
const BLAST_SECONDS = 0.75;

/** Share of columns that carry a single falling number before the final flood. */
export function rainDensity(t: number): number {
  const S = ACT_START;
  if (t < S.turn) return 0.09 * ramp(t, 0.2, 0.9);
  if (t < S.orbit) return lerp(0.09, 0.025, ramp(t, S.turn, S.orbit));
  if (t < S.smoke) return 0.025;
  if (t < S.fall) return lerp(0.025, 0, ramp(t, S.smoke, S.fall));
  return 0;
}

/**
 * The whole film as one object: draws the 3D world at time `t`, shrinks it to the digit grid,
 * adds the Matrix rain and finally the portrait, and writes digits and tones into the glyph field.
 */
export class IntroSequence {
  private readonly raster: SceneRaster;
  private readonly world: World;
  private readonly rain: MatrixRain;
  private readonly shader: CellShader;
  private readonly lum: Float32Array;
  private readonly palette: Uint8Array;
  private readonly locked: Uint8Array;
  private blasted = false;
  private settled = false;
  private readonly centerX: number;
  private readonly centerY: number;
  private portrait: Float32Array | null = null;
  private inside: Uint8Array | null = null;

  constructor(grid: SequenceGrid, count: number) {
    this.raster = new SceneRaster(grid.cols, grid.rows, grid.cellW, grid.cellH);
    this.world = new World(
      this.raster.ctx,
      grid.cols * grid.cellW,
      grid.rows * grid.cellH,
      grid.cellW,
      grid.cellH,
    );
    this.centerX = (grid.cols * grid.cellW) / 2;
    this.centerY = (grid.rows * grid.cellH) / 2;
    this.rain = new MatrixRain(grid.cols, grid.rows);
    this.shader = new CellShader(count);
    this.lum = new Float32Array(count);
    this.palette = new Uint8Array(count);
    this.locked = new Uint8Array(count);
  }

  /** The finished portrait: brightness per cell and which cells belong to it. */
  setPortrait(brightness: Float32Array, inside: Uint8Array): void {
    this.portrait = brightness;
    this.inside = inside;
  }

  get hasPortrait(): boolean {
    return this.portrait !== null;
  }

  act(t: number): ActName {
    return actAt(t);
  }

  /** Things that happen to the digits themselves (not to the picture): the blast and the way back. */
  private driveField(field: GlyphField, t: number): void {
    const blastAt = ACT_START.explosion;
    if (t >= blastAt && !this.blasted) {
      this.blasted = true;
      field.blast(this.centerX, this.centerY);
    }
    if (t >= blastAt + BLAST_SECONDS && !this.settled) {
      this.settled = true;
      field.beginScene();
    }
  }

  /** Renders second `t` of the film into `field`. `dt` is the frame time in seconds. */
  frame(field: GlyphField, ramp8: Uint8Array, dt: number, t: number): void {
    const { raster, lum, palette, locked } = this;
    this.driveField(field, t);
    raster.begin();
    this.world.render(t);
    raster.sample(lum, palette);
    locked.fill(0);

    const S = ACT_START;
    if (t < S.matrix) {
      const density = rainDensity(t);
      if (density > 0) this.rain.apply(lum, palette, GREEN, t, density, 0.9, 0.5);
    } else {
      const tau = t - S.matrix;
      this.rain.apply(lum, palette, GREEN, tau, 1, 0.95, 0.9, true);
      if (this.portrait && this.inside && tau >= WAVE_START) {
        this.rain.wave(
          lum,
          palette,
          locked,
          tau - WAVE_START,
          WAVE_SECONDS,
          this.portrait,
          this.inside,
        );
      }
    }
    this.shader.shade(field, lum, palette, ramp8, dt, locked, t < LEFTOVER_SECONDS ? 6 : 0);
  }
}
