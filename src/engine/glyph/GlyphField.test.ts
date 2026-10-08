import { describe, expect, it } from 'vitest';

import { GlyphField, type MorphTargets, type PointerState } from './GlyphField';
import { assignTargets, computeGrid } from './portrait';

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

describe('GlyphField explode + morph', () => {
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

  it('morph pulls targeted particles onto their targets and fades the rest', () => {
    const f = makeField();
    f.explode(150, 100);
    run(f, 0.65);

    const targetCount = 120;
    const particles = assignTargets(targetCount, f.count);
    const targets: MorphTargets = {
      particles,
      xs: Float32Array.from({ length: targetCount }, (_, k) => 200 + (k % 12) * 6),
      ys: Float32Array.from({ length: targetCount }, (_, k) => 50 + Math.floor(k / 12) * 10),
      glyphs: Uint8Array.from({ length: targetCount }, (_, k) => k % 10),
      tones: Float32Array.from({ length: targetCount }, () => 6),
    };
    f.morphTo(targets);
    run(f, 1.8);

    expect(f.maxTargetError()).toBeLessThan(1.5);
    const first = particles[0]!;
    expect(f.glyph[first]).toBe(0);
    expect(f.tone[first]).toBeGreaterThan(5);

    const targeted = new Set(particles);
    let faded = 0;
    for (let i = 0; i < f.count; i++) if (!targeted.has(i) && f.tone[i]! < 0.5) faded++;
    expect(faded).toBe(f.count - targetCount);
  });

  it('hold() snaps a half-finished morph onto the targets (slow device)', () => {
    const f = makeField();
    const particles = assignTargets(60, f.count);
    f.morphTo({
      particles,
      xs: Float32Array.from({ length: 60 }, (_, k) => 20 + (k % 10) * 8),
      ys: Float32Array.from({ length: 60 }, (_, k) => 20 + Math.floor(k / 10) * 12),
      glyphs: Uint8Array.from({ length: 60 }, (_, k) => k % 10),
      tones: Float32Array.from({ length: 60 }, () => 6),
    });
    for (let t = 0; t < 0.2; t += 0.1) f.step(0.1, NO_POINTER); // only a couple of coarse frames
    expect(f.maxTargetError()).toBeGreaterThan(5);
    f.hold();
    expect(f.maxTargetError()).toBe(0);
  });

  it('converges to the same place at 20 fps as at 60 fps (frame-rate independent damping)', () => {
    const settle = (dt: number): number => {
      const f = makeField();
      const particles = assignTargets(60, f.count);
      f.morphTo({
        particles,
        xs: Float32Array.from({ length: 60 }, () => 250),
        ys: Float32Array.from({ length: 60 }, () => 150),
        glyphs: new Uint8Array(60),
        tones: new Float32Array(60).fill(5),
      });
      for (let t = 0; t < 1.5; t += dt) f.step(dt, NO_POINTER);
      return f.maxTargetError();
    };
    expect(settle(1 / 60)).toBeLessThan(2);
    expect(settle(1 / 20)).toBeLessThan(6);
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

function meanDistance(f: GlyphField, ox: number, oy: number): number {
  let sum = 0;
  for (let i = 0; i < f.count; i++) sum += Math.hypot(f.x[i]! - ox, f.y[i]! - oy);
  return sum / f.count;
}
