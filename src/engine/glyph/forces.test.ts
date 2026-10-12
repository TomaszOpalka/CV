import { describe, expect, it } from 'vitest';

import { dragFactor, explosionSpeed, falloff, springStep } from './forces';

describe('falloff', () => {
  it('is 1 at the centre, 0 at and beyond the radius, and monotonic', () => {
    expect(falloff(0, 100)).toBe(1);
    expect(falloff(100, 100)).toBe(0);
    expect(falloff(250, 100)).toBe(0);
    expect(falloff(25, 100)).toBeGreaterThan(falloff(50, 100));
    expect(falloff(50, 100)).toBeGreaterThan(falloff(75, 100));
  });
});

describe('explosionSpeed', () => {
  it('decays with distance', () => {
    expect(explosionSpeed(0, 1000, 300)).toBe(1000);
    expect(explosionSpeed(300, 1000, 300)).toBeCloseTo(1000 / Math.E, 5);
    expect(explosionSpeed(900, 1000, 300)).toBeLessThan(explosionSpeed(300, 1000, 300));
  });
});

describe('dragFactor', () => {
  it('is frame-rate independent: two half steps equal one full step', () => {
    const full = dragFactor(3, 0.032);
    const half = dragFactor(3, 0.016);
    expect(half * half).toBeCloseTo(full, 10);
  });
});

describe('springStep', () => {
  it('settles on the target without running away', () => {
    const pos = new Float32Array([0]);
    const vel = new Float32Array([0]);
    let maxAbs = 0;
    for (let frame = 0; frame < 240; frame++) {
      springStep(pos, vel, 0, 100, 70, 12, 1 / 60);
      maxAbs = Math.max(maxAbs, Math.abs(pos[0]!));
    }
    expect(pos[0]).toBeCloseTo(100, 0);
    expect(Math.abs(vel[0]!)).toBeLessThan(0.5);
    expect(maxAbs).toBeLessThan(130); // at most a mild overshoot
  });

  it('stays stable at a coarse 30 fps step', () => {
    const pos = new Float32Array([-500]);
    const vel = new Float32Array([0]);
    for (let frame = 0; frame < 120; frame++) springStep(pos, vel, 0, 40, 70, 12, 1 / 30);
    expect(pos[0]).toBeCloseTo(40, 0);
  });
});
