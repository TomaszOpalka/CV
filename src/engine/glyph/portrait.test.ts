import { describe, expect, it } from 'vitest';

import {
  assignTargets,
  autoLevels,
  brightnessToGlyph,
  brightnessToTone,
  computeGrid,
  coverCrop,
  rampFromCoverage,
  estimateBackground,
  inkThreshold,
  rankAssign,
  sampleInk,
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
  it('keeps very dark cells invisible', () => {
    expect(brightnessToTone(0.02, 8)).toBe(0);
    expect(brightnessToTone(1, 8)).toBe(7);
  });
});

describe('assignTargets', () => {
  it('is injective and in range when targets <= particles', () => {
    const idx = assignTargets(300, 1000);
    expect(idx.length).toBe(300);
    expect(new Set(idx).size).toBe(300);
    expect(Math.max(...idx)).toBeLessThan(1000);
  });
  it('caps at the particle count when there are more targets', () => {
    const idx = assignTargets(500, 200);
    expect(idx.length).toBe(200);
    expect(new Set(idx).size).toBe(200);
  });
});

function paper(
  width: number,
  height: number,
  bg: [number, number, number],
  ink: [number, number, number],
  isInk: (x: number, y: number) => boolean,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = isInk(x, y) ? ink : bg;
      const p = (y * width + x) * 4;
      data[p] = c[0];
      data[p + 1] = c[1];
      data[p + 2] = c[2];
      data[p + 3] = 255;
    }
  }
  return data;
}

describe('estimateBackground / sampleInk', () => {
  it('finds the paper colour regardless of the line colour', () => {
    const data = paper(40, 40, [40, 80, 160], [255, 255, 255], (x) => x === 20);
    const [r, g, b] = estimateBackground(data);
    expect(Math.abs(r - 40)).toBeLessThan(16);
    expect(Math.abs(g - 80)).toBeLessThan(16);
    expect(Math.abs(b - 160)).toBeLessThan(16);
  });

  it('lights up a hairline even when it is much thinner than a cell, on blue, black and white paper', () => {
    const papers: Array<[[number, number, number], [number, number, number]]> = [
      [
        [40, 80, 160],
        [255, 255, 255],
      ], // white on blueprint blue
      [
        [10, 20, 25],
        [0, 220, 200],
      ], // cyan on near-black
      [
        [250, 250, 250],
        [20, 20, 20],
      ], // black on white
    ];
    for (const [bg, line] of papers) {
      const data = paper(80, 80, bg, line, (x) => x === 40); // 1 px wide vertical line, cells are 8 px
      const ink = sampleInk(data, 80, 80, 10, 10);
      expect(ink[5 * 10 + 5]).toBeGreaterThan(0.5); // the column that holds the line
      expect(ink[5 * 10 + 1]).toBeLessThan(0.05); // empty paper
    }
  });
});

describe('inkThreshold', () => {
  it('keeps the minimum when few cells qualify and raises it to cap the count', () => {
    const v = Float32Array.from([0.1, 0.9, 0.5, 0.7, 0.3, 0.8]);
    expect(inkThreshold(v, 0.25, 10)).toBe(0.25);
    const raised = inkThreshold(v, 0.25, 3);
    expect(Array.from(v).filter((x) => x >= raised).length).toBe(3);
  });
});

describe('rankAssign', () => {
  it('maps targets onto distinct particles, keeping left on the left and top on top', () => {
    const n = 400;
    const px = Float32Array.from({ length: n }, (_, i) => (i % 20) * 10);
    const py = Float32Array.from({ length: n }, (_, i) => Math.floor(i / 20) * 10);
    // 40 targets: a vertical bar on the far left and a vertical bar on the far right
    const tx = Float32Array.from({ length: 40 }, (_, k) => (k < 20 ? 5 : 185));
    const ty = Float32Array.from({ length: 40 }, (_, k) => (k % 20) * 10);
    const owners = rankAssign(px, py, n, tx, ty, 10);
    expect(new Set(owners).size).toBe(40);
    const leftOwners = Array.from(owners.slice(0, 20));
    const rightOwners = Array.from(owners.slice(20));
    const meanX = (idx: number[]) => idx.reduce((s, i) => s + px[i]!, 0) / idx.length;
    expect(meanX(leftOwners)).toBeLessThan(meanX(rightOwners));
  });

  it('copes with particles that were flung far off screen', () => {
    const n = 100;
    const px = Float32Array.from({ length: n }, (_, i) => (i % 2 ? -50000 : 50000));
    const py = Float32Array.from({ length: n }, (_, i) => i * 3000);
    const owners = rankAssign(
      px,
      py,
      n,
      Float32Array.from([10, 20, 30]),
      Float32Array.from([10, 20, 30]),
      10,
    );
    expect(new Set(owners).size).toBe(3);
    expect(Math.max(...owners)).toBeLessThan(n);
  });
});
