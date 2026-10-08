import { describe, expect, it } from 'vitest';

import {
  FIBONACCI_ARCS,
  SEAM_FROM,
  SEAM_TO,
  spiralClosed,
  spiralMorph,
  spiralOpen,
} from './spiral';

const p = new Float64Array(2);
const q = new Float64Array(2);
const dist = (v: Float64Array): number => Math.hypot(v[0]!, v[1]!);

describe('smoke spiral', () => {
  it('uses the Fibonacci arcs 8, 5, 3, 2, 1 and the seam is the third one', () => {
    expect([...FIBONACCI_ARCS]).toEqual([8, 5, 3, 2, 1]);
    expect(SEAM_FROM).toBeCloseTo(13 / 19);
    expect(SEAM_TO).toBeCloseTo(16 / 19);
  });

  it('winds in from the outer radius to the eye, never growing again', () => {
    spiralOpen(0, 2, 0, 0, p);
    expect(dist(p)).toBeCloseTo(2);
    let last = 2;
    for (let s = 0; s <= 1.0001; s += 0.02) {
      spiralOpen(s, 2, 0.3, 0, p);
      expect(dist(p)).toBeLessThanOrEqual(last + 1e-9);
      last = dist(p);
    }
    expect(last).toBeLessThan(0.3);
  });

  it('closes into a circle of the ball radius, with the third arc as a seam inside it', () => {
    for (let s = 0; s <= 1; s += 0.01) {
      spiralClosed(s, 0.2, 0.4, p);
      if (s >= SEAM_FROM && s <= SEAM_TO) expect(dist(p)).toBeLessThanOrEqual(0.2 + 1e-9);
      else expect(dist(p)).toBeCloseTo(0.2);
    }
    spiralClosed(SEAM_FROM, 0.2, 0, p);
    expect(p[1]).toBeCloseTo(0.2); // the seam starts at the top of the ball
    spiralClosed(SEAM_TO, 0.2, 0, p);
    expect(p[1]).toBeCloseTo(-0.2); // and ends at the bottom
  });

  it('the morph starts open, ends closed and moves smoothly between', () => {
    spiralMorph(0.5, 0, 2, 0.2, 0.3, p, q);
    spiralOpen(0.5, 2, 0.3, 0, q);
    expect(p[0]).toBeCloseTo(q[0]!);
    expect(p[1]).toBeCloseTo(q[1]!);
    for (const s of [0.1, 0.5, 0.9]) {
      spiralMorph(s, 1, 2, 0.2, 0.3, p, q);
      expect(dist(p)).toBeLessThanOrEqual(0.2 + 1e-9);
    }
    spiralMorph(0.3, 0, 2, 0.2, 0.3, p, q);
    let prevX = p[0]!;
    let prevY = p[1]!;
    for (let k = 0.01; k <= 1.0001; k += 0.01) {
      spiralMorph(0.3, k, 2, 0.2, 0.3, p, q);
      expect(Math.hypot(p[0]! - prevX, p[1]! - prevY)).toBeLessThan(0.35);
      prevX = p[0]!;
      prevY = p[1]!;
    }
  });
});
