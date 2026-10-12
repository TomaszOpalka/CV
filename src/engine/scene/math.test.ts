import { describe, expect, it } from 'vitest';

import { clamp01, easeInOut, hash1, KeyTrack, ramp, smoothstep } from './math';

describe('easing helpers', () => {
  it('clamp, ramp and smoothstep stay inside 0..1 and hit their ends', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(4)).toBe(1);
    expect(ramp(5, 10, 20)).toBe(0);
    expect(ramp(15, 10, 20)).toBeCloseTo(0.5);
    expect(ramp(25, 10, 20)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
    expect(easeInOut(0)).toBeCloseTo(0);
    expect(easeInOut(1)).toBeCloseTo(1);
  });

  it('hash1 is deterministic and spread over 0..1', () => {
    expect(hash1(12)).toBe(hash1(12));
    const values = Array.from({ length: 200 }, (_, i) => hash1(i));
    expect(Math.min(...values)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...values)).toBeLessThan(1);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeGreaterThan(0.35);
    expect(mean).toBeLessThan(0.65);
  });
});

describe('KeyTrack', () => {
  const track = new KeyTrack([
    [0, 0, 100],
    [1, 10, 100],
    [2, 10, 50],
    [3, 0, 50],
  ]);
  const out = [0, 0];

  it('passes through every key', () => {
    for (const [t, a, b] of [
      [0, 0, 100],
      [1, 10, 100],
      [2, 10, 50],
      [3, 0, 50],
    ] as const) {
      track.sample(t, out);
      expect(out[0]).toBeCloseTo(a);
      expect(out[1]).toBeCloseTo(b);
    }
  });

  it('holds the first and last value outside the keys', () => {
    track.sample(-5, out);
    expect(out).toEqual([0, 100]);
    track.sample(99, out);
    expect(out).toEqual([0, 50]);
  });

  it('never overshoots between keys and stays flat across equal keys', () => {
    for (let t = 0; t <= 3; t += 0.01) {
      track.sample(t, out);
      expect(out[0]!).toBeGreaterThanOrEqual(-1e-9);
      expect(out[0]!).toBeLessThanOrEqual(10 + 1e-9);
      expect(out[1]!).toBeGreaterThanOrEqual(50 - 1e-9);
      expect(out[1]!).toBeLessThanOrEqual(100 + 1e-9);
    }
    track.sample(1.5, out);
    expect(out[0]).toBeCloseTo(10);
  });

  it('is continuous (no jumps larger than the local slope allows)', () => {
    let prev = 0;
    for (let t = 0; t <= 3; t += 0.005) {
      track.sample(t, out);
      if (t > 0) expect(Math.abs(out[0]! - prev)).toBeLessThan(0.2);
      prev = out[0]!;
    }
  });

  it('rejects a single key', () => {
    expect(() => new KeyTrack([[0, 1]])).toThrow();
  });
});
