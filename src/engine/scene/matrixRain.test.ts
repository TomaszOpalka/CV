import { describe, expect, it } from 'vitest';

import { GREEN, WHITE } from '../glyph/palette';
import { MatrixRain } from './matrixRain';

const COLS = 40;
const ROWS = 30;

function maps(): { lum: Float32Array; palette: Uint8Array; locked: Uint8Array } {
  return {
    lum: new Float32Array(COLS * ROWS),
    palette: new Uint8Array(COLS * ROWS),
    locked: new Uint8Array(COLS * ROWS),
  };
}

describe('MatrixRain.apply', () => {
  it('draws nothing at density 0 and something everywhere at density 1', () => {
    const rain = new MatrixRain(COLS, ROWS);
    const none = maps();
    rain.apply(none.lum, none.palette, GREEN, 3, 0, 1);
    expect(none.lum.every((v) => v === 0)).toBe(true);

    const all = maps();
    rain.apply(all.lum, all.palette, GREEN, 3, 1, 1);
    const lit = all.lum.filter((v) => v > 0).length;
    expect(lit).toBeGreaterThan(COLS * 3);
    expect(Math.max(...all.lum)).toBeLessThanOrEqual(1);
  });

  it('a higher density activates more columns', () => {
    const rain = new MatrixRain(COLS, ROWS);
    const count = (density: number): number => {
      const m = maps();
      rain.apply(m.lum, m.palette, GREEN, 5, density, 1);
      return m.lum.filter((v) => v > 0).length;
    };
    expect(count(0.2)).toBeLessThan(count(0.9));
  });

  it('heads are white and tails take the rain colour', () => {
    const rain = new MatrixRain(COLS, ROWS);
    const m = maps();
    rain.apply(m.lum, m.palette, GREEN, 4, 1, 1);
    const colors = new Set<number>();
    m.lum.forEach((v, i) => {
      if (v > 0) colors.add(m.palette[i]!);
    });
    expect(colors.has(WHITE)).toBe(true);
    expect(colors.has(GREEN)).toBe(true);
  });

  it('with fromTop nothing has fallen before its start and the first drops enter at the top rows', () => {
    const rain = new MatrixRain(COLS, ROWS);
    const m = maps();
    rain.apply(m.lum, m.palette, GREEN, -1, 1, 1, 1, true);
    expect(m.lum.every((v) => v === 0)).toBe(true);
    rain.apply(m.lum, m.palette, GREEN, 0.3, 1, 1, 1, true);
    let lowest = 0;
    m.lum.forEach((v, i) => {
      if (v > 0) lowest = Math.max(lowest, Math.floor(i / COLS));
    });
    expect(lowest).toBeLessThan(ROWS * 0.6);
  });
});

describe('MatrixRain.wave', () => {
  const target = new Float32Array(COLS * ROWS).fill(0.5);
  const inside = new Uint8Array(COLS * ROWS);
  for (let r = 5; r < 25; r++) for (let c = 10; c < 30; c++) inside[r * COLS + c] = 1;

  it('locks nothing at the start and the whole picture at the end', () => {
    const rain = new MatrixRain(COLS, ROWS);
    const start = maps();
    expect(rain.wave(start.lum, start.palette, start.locked, -0.5, 2, target, inside)).toBe(0);
    expect(start.locked.some((v) => v === 1)).toBe(false);

    const end = maps();
    const finished = rain.wave(end.lum, end.palette, end.locked, 2, 2, target, inside);
    expect(finished).toBe(1);
    expect(end.locked.every((v) => v === 1)).toBe(true);
    for (let i = 0; i < end.lum.length; i++) {
      expect(end.lum[i]).toBeCloseTo(inside[i] ? 0.5 : 0);
    }
  });

  it('settles top to bottom: the share of locked cells only grows with time', () => {
    const rain = new MatrixRain(COLS, ROWS);
    let previous = -1;
    for (const time of [0.2, 0.6, 1.0, 1.4, 1.8]) {
      const m = maps();
      rain.wave(m.lum, m.palette, m.locked, time, 2, target, inside);
      const locked = m.locked.reduce((sum, v) => sum + v, 0);
      expect(locked).toBeGreaterThanOrEqual(previous);
      previous = locked;
    }
  });
});
