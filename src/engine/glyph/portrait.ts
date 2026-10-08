/**
 * Pure helpers that turn a photo into a grid of digits: grid geometry, luminance
 * sampling, auto-levels and the brightness -> digit ramp. No DOM access here.
 */

export interface Grid {
  cols: number;
  rows: number;
  /** Width of one glyph cell in CSS px. */
  cellW: number;
  /** Height of one glyph cell in CSS px. */
  cellH: number;
}

/** Glyph cells are taller than wide (monospace digits), so the grid is anisotropic. */
export const CELL_ASPECT = 0.6;

export function computeGrid(width: number, height: number, cell: number): Grid {
  const cellW = cell * CELL_ASPECT;
  const cellH = cell;
  return {
    cols: Math.max(1, Math.ceil(width / cellW)),
    rows: Math.max(1, Math.ceil(height / cellH)),
    cellW,
    cellH,
  };
}

export interface Crop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

/**
 * Source rectangle for `object-fit: cover` into a box of `dstAspect` (w / h).
 * `focalX` / `focalY` (0..1) work like CSS `object-position`.
 */
export function coverCrop(
  srcW: number,
  srcH: number,
  dstAspect: number,
  focalX = 0.5,
  focalY = 0.5,
): Crop {
  const srcAspect = srcW / srcH;
  if (srcAspect > dstAspect) {
    const sw = srcH * dstAspect;
    return { sx: (srcW - sw) * focalX, sy: 0, sw, sh: srcH };
  }
  const sh = srcW / dstAspect;
  return { sx: 0, sy: (srcH - sh) * focalY, sw: srcW, sh };
}

/** Box-average luminance (0..1) of RGBA pixels into a `cols` x `rows` grid. */
export function sampleLuminance(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  cols: number,
  rows: number,
): Float32Array {
  const out = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    const y0 = Math.floor((row * srcH) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((row + 1) * srcH) / rows));
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor((col * srcW) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) * srcW) / cols));
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * srcW + x) * 4;
          sum += 0.2126 * rgba[p]! + 0.7152 * rgba[p + 1]! + 0.0722 * rgba[p + 2]!;
          n++;
        }
      }
      out[row * cols + col] = n > 0 ? sum / n / 255 : 0;
    }
  }
  return out;
}

/**
 * Stretches brightness so the `lowPct`..`highPct` percentile range fills 0..1, then applies
 * `gamma`. Makes any photo (dark, flat, washed out) use the full digit ramp. Mutates and returns `values`.
 */
export function autoLevels(
  values: Float32Array,
  lowPct = 0.03,
  highPct = 0.97,
  gamma = 0.9,
): Float32Array {
  const BINS = 256;
  const hist = new Uint32Array(BINS);
  for (let i = 0; i < values.length; i++) {
    hist[Math.min(BINS - 1, Math.max(0, Math.floor(values[i]! * BINS)))]!++;
  }
  const percentile = (pct: number): number => {
    const target = pct * values.length;
    let acc = 0;
    for (let b = 0; b < BINS; b++) {
      acc += hist[b]!;
      // `acc > 0` skips leading empty bins, so percentile 0 is the true minimum.
      if (acc > 0 && acc >= target) return b / (BINS - 1);
    }
    return 1;
  };
  const low = percentile(lowPct);
  const high = Math.max(percentile(highPct), low + 1e-3);
  for (let i = 0; i < values.length; i++) {
    const t = Math.min(1, Math.max(0, (values[i]! - low) / (high - low)));
    values[i] = Math.pow(t, gamma);
  }
  return values;
}

/** Digits ordered from least to most "ink" (pixel coverage). `coverage[d]` is the coverage of digit `d`. */
export function rampFromCoverage(coverage: ArrayLike<number>): Uint8Array {
  const order = Array.from({ length: coverage.length }, (_, d) => d);
  order.sort((a, b) => coverage[a]! - coverage[b]! || a - b);
  return Uint8Array.from(order);
}

/**
 * Maps brightness 0..1 onto a digit via the ramp (bright -> dense digit).
 * `jitter` (0..1 of one ramp step, default 0) shifts the pick by a random amount so smooth
 * gradients do not turn into rows of identical digits. Pass a value in -0.5..0.5 as `noise`.
 */
export function brightnessToGlyph(
  brightness: number,
  ramp: Uint8Array,
  noise = 0,
  jitter = 0,
): number {
  const position = brightness * ramp.length + noise * jitter * 2;
  const idx = Math.min(ramp.length - 1, Math.max(0, Math.floor(position)));
  return ramp[idx]!;
}

/**
 * Maps brightness to a tone level 0..levels-1. Very dark cells stay at tone 0 (invisible),
 * so the portrait's background fades into the page.
 */
export function brightnessToTone(brightness: number, levels: number): number {
  const lifted = brightness < 0.06 ? 0 : brightness;
  return Math.round(lifted * (levels - 1));
}

/**
 * Spreads `targetCount` targets over `particleCount` particles in index order.
 * Returns the particle index for each target. Injective whenever targetCount <= particleCount.
 */
export function assignTargets(targetCount: number, particleCount: number): Uint32Array {
  const n = Math.min(targetCount, particleCount);
  const out = new Uint32Array(n);
  for (let k = 0; k < n; k++) {
    out[k] = Math.min(particleCount - 1, Math.floor((k * particleCount) / n));
  }
  return out;
}

/** Most common colour of the image on a coarse grid: the "paper" of a blueprint. */
export function estimateBackground(rgba: Uint8ClampedArray): [number, number, number] {
  const bins = new Uint32Array(4096);
  for (let p = 0; p < rgba.length; p += 4) {
    bins[((rgba[p]! >> 4) << 8) | ((rgba[p + 1]! >> 4) << 4) | (rgba[p + 2]! >> 4)]!++;
  }
  let best = 0;
  for (let i = 1; i < bins.length; i++) if (bins[i]! > bins[best]!) best = i;
  return [((best >> 8) & 15) * 16 + 8, ((best >> 4) & 15) * 16 + 8, (best & 15) * 16 + 8];
}

/**
 * "Ink" of a drawing in a `cols` x `rows` grid, 0..1: how far each pixel is from the background colour.
 * Works for white lines on blue paper, cyan on black, or black on white alike. Each cell mixes the
 * mean with the maximum so hairlines survive the reduction (a cell holding a thin line still lights up).
 */
export function sampleInk(
  rgba: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  cols: number,
  rows: number,
): Float32Array {
  const [br, bg, bb] = estimateBackground(rgba);
  const out = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    const y0 = Math.floor((row * srcH) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((row + 1) * srcH) / rows));
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor((col * srcW) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((col + 1) * srcW) / cols));
      let sum = 0;
      let max = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const p = (y * srcW + x) * 4;
          const d = Math.max(
            Math.abs(rgba[p]! - br),
            Math.abs(rgba[p + 1]! - bg),
            Math.abs(rgba[p + 2]! - bb),
          );
          sum += d;
          if (d > max) max = d;
          n++;
        }
      }
      out[row * cols + col] = n > 0 ? (0.35 * (sum / n) + 0.65 * max) / 255 : 0;
    }
  }
  return out;
}

/** Smallest value that keeps at most `maxCount` cells at or above `minValue` (the strongest ones win). */
export function inkThreshold(values: Float32Array, minValue: number, maxCount: number): number {
  let count = 0;
  for (let i = 0; i < values.length; i++) if (values[i]! >= minValue) count++;
  if (count <= maxCount) return minValue;
  const kept = new Float32Array(count);
  let k = 0;
  for (let i = 0; i < values.length; i++) if (values[i]! >= minValue) kept[k++] = values[i]!;
  kept.sort();
  return kept[count - maxCount]!;
}

const KEY_ROW_SPAN = 8192;
const KEY_INDEX_SPAN = 16384;

function rankKey(x: number, y: number, bandHeight: number, index: number): number {
  const band = Math.min(4095, Math.max(0, Math.floor(y / bandHeight) + 8));
  const column = Math.min(KEY_ROW_SPAN - 1, Math.max(0, Math.floor(x) + 4096));
  return (band * KEY_ROW_SPAN + column) * KEY_INDEX_SPAN + index;
}

/**
 * Assigns the targets to particles by "rank in reading order": the n-th target (top-left to
 * bottom-right) goes to the particle with the matching rank among all particles. Particles that are
 * on the left now end up on the left of the new shape, so a morph flows instead of criss-crossing.
 * Returns the particle index for every target (injective while targets <= particles).
 */
export function rankAssign(
  px: Float32Array,
  py: Float32Array,
  particleCount: number,
  tx: Float32Array,
  ty: Float32Array,
  bandHeight: number,
): Uint32Array {
  const n = Math.min(tx.length, particleCount);
  const particleKeys = new Float64Array(particleCount);
  for (let i = 0; i < particleCount; i++) particleKeys[i] = rankKey(px[i]!, py[i]!, bandHeight, i);
  particleKeys.sort();

  const targetKeys = new Float64Array(n);
  for (let k = 0; k < n; k++) targetKeys[k] = rankKey(tx[k]!, ty[k]!, bandHeight, k);
  targetKeys.sort();

  const out = new Uint32Array(tx.length);
  for (let rank = 0; rank < n; rank++) {
    const target = targetKeys[rank]! % KEY_INDEX_SPAN;
    const slot = Math.min(particleCount - 1, Math.floor((rank * particleCount) / n));
    out[target] = particleKeys[slot]! % KEY_INDEX_SPAN;
  }
  return out;
}
