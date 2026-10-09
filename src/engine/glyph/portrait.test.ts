import { describe, expect, it } from 'vitest';

import {
  autoLevels,
  brightnessToGlyph,
  computeGrid,
  coverCrop,
  localContrast,
  rampFromCoverage,
  sampleLuminance,
} from './portrait';

function solid(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = fill(x, y);
      const p = (y * width + x) * 4;
      data[p] = data[p + 1] = data[p + 2] = v;
      data[p + 3] = 255;
    }
  }
  return data;
}

describe('computeGrid', () => {
  it('covers the area with taller-than-wide cells', () => {
    const g = computeGrid(600, 300, 10);
    expect(g.cellW).toBeCloseTo(6);
    expect(g.cellH).toBe(10);
    expect(g.cols * g.cellW).toBeGreaterThanOrEqual(600);
    expect(g.rows * g.cellH).toBeGreaterThanOrEqual(300);
  });
});

describe('coverCrop', () => {
  it('crops the sides of a wide image', () => {
    const c = coverCrop(2000, 1000, 1);
    expect(c).toEqual({ sx: 500, sy: 0, sw: 1000, sh: 1000 });
  });
  it('crops top/bottom of a tall image using the focal point', () => {
    const top = coverCrop(1000, 2000, 1, 0.5, 0);
    const bottom = coverCrop(1000, 2000, 1, 0.5, 1);
    expect(top.sy).toBe(0);
    expect(bottom.sy).toBe(1000);
    expect(top.sh).toBe(1000);
  });
});

describe('sampleLuminance', () => {
  it('reads left-black / right-white as 0 and 1 per cell', () => {
    const data = solid(8, 4, (x) => (x < 4 ? 0 : 255));
    const lum = sampleLuminance(data, 8, 4, 2, 2);
    expect(Array.from(lum)).toEqual([0, 1, 0, 1]);
  });
  it('averages inside a cell', () => {
    const data = solid(4, 1, (x) => (x % 2 === 0 ? 0 : 255));
    const lum = sampleLuminance(data, 4, 1, 1, 1);
    expect(lum[0]).toBeCloseTo(0.5, 2);
  });
});

describe('autoLevels', () => {
  it('stretches a flat dark range to the full 0..1 range', () => {
    const values = Float32Array.from({ length: 100 }, (_, i) => 0.1 + (i / 99) * 0.2);
    autoLevels(values, 0, 1, 1);
    expect(Math.min(...values)).toBeCloseTo(0, 1);
    expect(Math.max(...values)).toBeCloseTo(1, 1);
  });
  it('does not produce NaN for a constant image', () => {
    const values = new Float32Array(50).fill(0.4);
    autoLevels(values);
    expect(values.every((v) => Number.isFinite(v))).toBe(true);
  });
});

describe('ramp helpers', () => {
  it('orders digits by ink coverage', () => {
    const coverage = [50, 5, 20, 30, 10, 40, 45, 8, 60, 35];
    const ramp = rampFromCoverage(coverage);
    expect(Array.from(ramp).slice(0, 3)).toEqual([1, 7, 4]);
    expect(ramp[ramp.length - 1]).toBe(8);
  });
  it('maps bright to dense digits and dark to light ones', () => {
    const ramp = Uint8Array.from([1, 7, 4, 2, 3, 5, 9, 0, 6, 8]);
    expect(brightnessToGlyph(0, ramp)).toBe(1);
    expect(brightnessToGlyph(1, ramp)).toBe(8);
  });
  it('jitter moves the pick by at most the requested number of ramp steps and stays in range', () => {
    const ramp = Uint8Array.from([1, 7, 4, 2, 3, 5, 9, 0, 6, 8]);
    expect(brightnessToGlyph(0.55, ramp, 0.5, 1.1)).not.toBe(brightnessToGlyph(0.55, ramp, 0, 1.1));
    expect(brightnessToGlyph(0, ramp, -0.5, 3)).toBe(1); // clamped at the light end
    expect(brightnessToGlyph(1, ramp, 0.5, 3)).toBe(8); // clamped at the dense end
  });
});

describe('localContrast', () => {
  it('leaves a flat area alone', () => {
    const v = new Float32Array(25).fill(0.5);
    localContrast(v, 5, 5, 1, 1);
    for (const x of v) expect(x).toBeCloseTo(0.5);
  });

  it('exaggerates an edge: the dark side gets darker and the bright side brighter', () => {
    const cols = 12;
    const v = new Float32Array(cols * 3);
    for (let y = 0; y < 3; y++) for (let x = 0; x < cols; x++) v[y * cols + x] = x < 6 ? 0.4 : 0.6;
    localContrast(v, cols, 3, 2, 1);
    expect(v[1 * cols + 5]!).toBeLessThan(0.4);
    expect(v[1 * cols + 6]!).toBeGreaterThan(0.6);
    expect(v[1 * cols + 0]!).toBeCloseTo(0.4, 1);
  });

  it('keeps values inside 0..1', () => {
    const v = Float32Array.from({ length: 36 }, (_, i) => (i % 2 ? 1 : 0));
    localContrast(v, 6, 6, 1, 3);
    for (const x of v) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });
});
