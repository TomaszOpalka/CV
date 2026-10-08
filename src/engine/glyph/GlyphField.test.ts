import { describe, expect, it } from 'vitest';

import { GlyphField, type PointerState } from './GlyphField';
import { computeGrid } from './portrait';

/** Small deterministic PRNG so the simulation tests are repeatable. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NO_POINTER: PointerState = { x: 0, y: 0, active: false, radius: 80 };
const DT = 1 / 60;

function makeField(): GlyphField {
  return new GlyphField(computeGrid(300, 200, 10), 8, mulberry32(7));
}

function run(field: GlyphField, seconds: number, pointer: PointerState = NO_POINTER): void {
  for (let t = 0; t < seconds; t += DT) field.step(DT, pointer);
}

describe('GlyphField idle', () => {
  it('starts with one particle per cell, all at home, digits 0-9', () => {
    const f = makeField();
    expect(f.count).toBe(f.cols * f.rows);
    expect(Array.from(f.x)).toEqual(Array.from(f.homeX));
    expect(Math.max(...f.glyph)).toBeLessThanOrEqual(9);
  });

  it('pushes particles away from the pointer and lets them settle back home', () => {
    const f = makeField();
    const centre = Math.floor(f.rows / 2) * f.cols + Math.floor(f.cols / 2);
    const pointer: PointerState = {
      x: f.homeX[centre]! - 10,
      y: f.homeY[centre]!,
      active: true,
      radius: 90,
    };
    run(f, 0.5, pointer);
    expect(f.x[centre]! - f.homeX[centre]!).toBeGreaterThan(8); // pushed to the right, away from the pointer
    run(f, 1.5, NO_POINTER);
    expect(Math.abs(f.x[centre]! - f.homeX[centre]!)).toBeLessThan(0.5);
  });

  it('leaves particles outside the radius alone', () => {
    const f = makeField();
    const pointer: PointerState = { x: 0, y: 0, active: true, radius: 40 };
    run(f, 0.3, pointer);
    const far = f.count - 1;
    expect(f.x[far]).toBeCloseTo(f.homeX[far]!, 3);
  });
});

describe('GlyphField explode + scene', () => {
  it('explosion moves particles away from the origin', () => {
    const f = makeField();
    const ox = 150;
    const oy = 100;
    const before = meanDistance(f, ox, oy);
    f.explode(ox, oy);
    run(f, 0.4);
    expect(f.phase).toBe('explode');
    expect(meanDistance(f, ox, oy)).toBeGreaterThan(before + 20);
  });

  it('a scene pulls every digit back to its own cell', () => {
    const f = makeField();
    f.explode(150, 100);
    run(f, 0.65);
    expect(maxHomeError(f)).toBeGreaterThan(20);
    f.beginScene();
    expect(f.phase).toBe('scene');
    run(f, 2);
    expect(maxHomeError(f)).toBeLessThan(0.5);
  });

  it('converges to the same place at 20 fps as at 60 fps (frame-rate independent damping)', () => {
    const settle = (dt: number): number => {
      const f = makeField();
      f.explode(150, 100);
      for (let t = 0; t < 0.65; t += 1 / 60) f.step(1 / 60, NO_POINTER);
      f.beginScene();
      for (let t = 0; t < 1.5; t += dt) f.step(dt, NO_POINTER);
      return maxHomeError(f);
    };
    expect(settle(1 / 60)).toBeLessThan(1);
    expect(settle(1 / 20)).toBeLessThan(3);
  });

  it('hold() freezes the digits', () => {
    const f = makeField();
    f.explode(150, 100);
    run(f, 0.3);
    f.hold();
    const x = Array.from(f.x);
    run(f, 0.5);
    expect(Array.from(f.x)).toEqual(x);
  });

  it('fade() drives all tones to zero', () => {
    const f = makeField();
    f.hold();
    for (let t = 0; t < 2; t += DT) f.fade(DT, 4);
    expect(Math.max(...f.tone)).toBeLessThan(0.01);
  });

  it('keeps every coordinate finite through a long run', () => {
    const f = makeField();
    f.explode(0, 0);
    run(f, 3);
    expect(f.x.every(Number.isFinite) && f.y.every(Number.isFinite)).toBe(true);
  });
});

function maxHomeError(f: GlyphField): number {
  let max = 0;
  for (let i = 0; i < f.count; i++) {
    max = Math.max(max, Math.hypot(f.x[i]! - f.homeX[i]!, f.y[i]! - f.homeY[i]!));
  }
  return max;
}

function meanDistance(f: GlyphField, ox: number, oy: number): number {
  let sum = 0;
  for (let i = 0; i < f.count; i++) sum += Math.hypot(f.x[i]! - ox, f.y[i]! - oy);
  return sum / f.count;
}
