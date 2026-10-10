import { heatBucket } from '../pixels/heatPalette';

const COOL_PER_SECOND = 2;
const PROFILE_POWER = 0.9;
const PEAK = 1.25;
const FLICKER = 0.12;

/**
 * A coarse grid of heat (one cell per digit) that the pointer paints with: the cursor's "comet". Stamping a
 * disc heats the cells around a point (hot core, cooler ragged edge); every step the heat cools, so the path
 * behind the pointer fades from hot to cold and disappears. Lit cells keep changing their digit. Only the
 * bounding box of lit cells is scanned, so an idle cursor costs nothing. No allocation after construction.
 */
export class HeatBrush {
  readonly cols: number;
  readonly rows: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly heat: Float32Array;
  readonly noise: Float32Array;
  readonly glyph: Uint8Array;

  private minCol: number;
  private maxCol = -1;
  private minRow: number;
  private maxRow = -1;
  private readonly rng: () => number;

  constructor(
    cols: number,
    rows: number,
    cellW: number,
    cellH: number,
    rng: () => number = Math.random,
  ) {
    this.cols = cols;
    this.rows = rows;
    this.cellW = cellW;
    this.cellH = cellH;
    this.rng = rng;
    this.heat = new Float32Array(cols * rows);
    this.noise = new Float32Array(cols * rows);
    this.glyph = new Uint8Array(cols * rows);
    for (let i = 0; i < this.noise.length; i++) {
      this.noise[i] = (rng() - 0.5) * 0.14;
      this.glyph[i] = Math.floor(rng() * 10);
    }
    this.minCol = cols;
    this.minRow = rows;
  }

  /** Heat the cells within `radius` px of (x, y). Hotter cells stay as they are. */
  stamp(x: number, y: number, radius: number, strength = PEAK): void {
    const c0 = Math.max(0, Math.floor((x - radius) / this.cellW));
    const c1 = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellW));
    const r0 = Math.max(0, Math.floor((y - radius) / this.cellH));
    const r1 = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellH));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const dx = (c + 0.5) * this.cellW - x;
        const dy = (r + 0.5) * this.cellH - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= radius) continue;
        const level = strength * (1 - d / radius) ** PROFILE_POWER;
        const i = r * this.cols + c;
        if (level > this.heat[i]!) this.heat[i] = level;
      }
    }
    if (c0 < this.minCol) this.minCol = c0;
    if (c1 > this.maxCol) this.maxCol = c1;
    if (r0 < this.minRow) this.minRow = r0;
    if (r1 > this.maxRow) this.maxRow = r1;
  }

  /** Stamp along a segment so fast moves leave a continuous band. */
  stampSegment(x0: number, y0: number, x1: number, y1: number, radius: number): void {
    const distance = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(distance / (this.cellW * 0.75)));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      this.stamp(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius);
    }
  }

  /** Cool everything down; returns how many cells are still lit (0 means nothing to draw). */
  step(dt: number): number {
    if (this.maxCol < 0) return 0;
    const cool = COOL_PER_SECOND * dt;
    let lit = 0;
    let minCol = this.cols;
    let maxCol = -1;
    let minRow = this.rows;
    let maxRow = -1;
    for (let r = this.minRow; r <= this.maxRow; r++) {
      for (let c = this.minCol; c <= this.maxCol; c++) {
        const i = r * this.cols + c;
        const h = this.heat[i]!;
        if (h <= 0) continue;
        const next = h - cool;
        if (next <= 0.02) {
          this.heat[i] = 0;
          continue;
        }
        this.heat[i] = next;
        if (this.rng() < FLICKER) this.glyph[i] = Math.floor(this.rng() * 10);
        lit++;
        if (c < minCol) minCol = c;
        if (c > maxCol) maxCol = c;
        if (r < minRow) minRow = r;
        if (r > maxRow) maxRow = r;
      }
    }
    this.minCol = minCol;
    this.maxCol = maxCol;
    this.minRow = minRow;
    this.maxRow = maxRow;
    return lit;
  }

  /** Ramp index of a cell (-1: cold). */
  bucket(i: number): number {
    const h = this.heat[i]!;
    return h > 0 ? heatBucket(h + this.noise[i]!) : -1;
  }

  /** Inclusive bounds of the lit area, or null when nothing is lit. */
  bounds(): { minCol: number; maxCol: number; minRow: number; maxRow: number } | null {
    if (this.maxCol < 0) return null;
    return { minCol: this.minCol, maxCol: this.maxCol, minRow: this.minRow, maxRow: this.maxRow };
  }
}
