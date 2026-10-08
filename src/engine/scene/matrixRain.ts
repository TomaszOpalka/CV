import { WHITE } from '../glyph/palette';
import { hash1 } from './math';

/**
 * "Matrix" rain on the digit grid: every column owns a falling drop with a fading tail.
 * Works directly on a brightness map (cells), after the vector scene has been sampled.
 */
export class MatrixRain {
  /** Per column: random 0..1 deciding whether the column takes part at a given density. */
  private readonly gate: Float32Array;
  private readonly delay: Float32Array;
  private readonly speed: Float32Array;
  private readonly trail: Float32Array;
  private readonly phase: Float32Array;

  constructor(
    private readonly cols: number,
    private readonly rows: number,
    seed = 1,
  ) {
    this.gate = new Float32Array(cols);
    this.delay = new Float32Array(cols);
    this.speed = new Float32Array(cols);
    this.trail = new Float32Array(cols);
    this.phase = new Float32Array(cols);
    for (let c = 0; c < cols; c++) {
      const h = (k: number): number => hash1(seed * 977 + c * 13.7 + k * 101.3);
      this.gate[c] = h(1);
      this.delay[c] = h(2);
      // Rows per second: a drop crosses the screen in 1.2 .. 2.6 s.
      this.speed[c] = rows / (1.2 + 1.4 * h(3));
      this.trail[c] = 4 + 14 * h(4);
      this.phase[c] = h(5) * (rows + 30);
    }
  }

  /**
   * Adds looping rain. `density` (0..1) is the share of columns that are active, `trailScale`
   * stretches the tails, `strength` is the peak brightness. Existing cell values are kept when brighter.
   * With `fromTop` every drop starts at the top after its own small delay (`time` counts from the
   * start of the flood), so the screen fills with rain from above instead of everywhere at once.
   */
  apply(
    lum: Float32Array,
    palette: Uint8Array,
    color: number,
    time: number,
    density: number,
    strength: number,
    trailScale = 1,
    fromTop = false,
  ): void {
    const { cols, rows } = this;
    for (let c = 0; c < cols; c++) {
      if (this.gate[c]! > density) continue;
      const trail = this.trail[c]! * trailScale;
      const period = rows + trail * 3 + 8;
      let head = fromTop
        ? (time - this.delay[c]! * 0.7) * this.speed[c]!
        : time * this.speed[c]! + this.phase[c]!;
      if (head < 0) continue;
      head -= Math.floor(head / period) * period;
      const first = Math.max(0, Math.ceil(head - trail * 3));
      const last = Math.min(rows - 1, Math.floor(head));
      for (let r = first; r <= last; r++) {
        const d = head - r;
        const v = (d < 1 ? 1 : Math.exp(-d / trail)) * strength;
        const i = r * cols + c;
        if (v > lum[i]!) {
          lum[i] = v;
          palette[i] = d < 1 ? WHITE : color;
        }
      }
    }
  }

  /**
   * A one-off wave that turns the rain into a picture: every column gets one bright head that runs
   * from the top to the bottom after its own delay. Cells above the head are "settled": they take
   * the value of `target` (cells outside the picture go dark) and are flagged in `locked`; cells
   * below keep whatever is in `lum`. `time` counts from the wave's start, `duration` is the whole
   * wave in seconds. Returns the share of finished columns.
   */
  wave(
    lum: Float32Array,
    palette: Uint8Array,
    locked: Uint8Array,
    time: number,
    duration: number,
    target: Float32Array,
    inside: Uint8Array,
  ): number {
    const { cols, rows } = this;
    let finished = 0;
    for (let c = 0; c < cols; c++) {
      const delay = this.delay[c]! * duration * 0.35;
      const run = duration * (0.55 + 0.1 * this.gate[c]!);
      const head = ((time - delay) / run) * (rows + 4);
      if (head >= rows + 4) finished++;
      const settled = Math.min(rows, Math.max(0, Math.floor(head)));
      for (let r = 0; r < settled; r++) {
        const i = r * cols + c;
        lum[i] = inside[i] ? target[i]! : 0;
        palette[i] = WHITE;
        locked[i] = 1;
      }
      // the bright head and a short glow just behind it
      if (head > 0) {
        for (
          let r = Math.max(0, Math.floor(head) - 1);
          r < Math.min(rows, Math.floor(head) + 1);
          r++
        ) {
          const i = r * cols + c;
          lum[i] = 1;
          palette[i] = WHITE;
          locked[i] = 0;
        }
      }
    }
    return finished / cols;
  }
}
