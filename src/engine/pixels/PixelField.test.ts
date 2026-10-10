import { describe, expect, it } from 'vitest';

import { CHARGE_SECONDS, PixelField, type HeatInput } from './PixelField';
import { Shockwave } from './Shockwave';

const away: HeatInput = { x: -9999, y: -9999, active: false, hold: 0 };

function seeded(): () => number {
  let s = 7;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('Shockwave', () => {
  it('reports each distance exactly once as the front passes', () => {
    const wave = new Shockwave(0, 0, 100);
    let hits = 0;
    for (let i = 0; i < 20; i++) {
      wave.advance(0.1);
      if (wave.passed(55)) hits++;
    }
    expect(hits).toBe(1);
  });

  it('is done once the front is beyond the farthest point', () => {
    const wave = new Shockwave(0, 0, 100);
    wave.advance(1);
    wave.advance(1);
    expect(wave.done(150)).toBe(false);
    wave.advance(1);
    expect(wave.done(150)).toBe(true);
  });
});

describe('PixelField', () => {
  it('has one pixel per cell, centred in the cell, and starts cold', () => {
    const field = new PixelField(4, 3, 10, 10, seeded());
    expect(field.count).toBe(12);
    expect(field.homeX[0]).toBe(5);
    expect(field.homeY[11]).toBe(25);
    expect(field.bucket.every((b) => b === -1)).toBe(true);
  });

  it('heats the cells around the pointer and leaves far ones cold', () => {
    const field = new PixelField(40, 10, 12, 12, seeded());
    for (let k = 0; k < 20; k++) field.step(1 / 60, { x: 6, y: 6, active: true, hold: 0 });
    expect(field.bucket[0]!).toBeGreaterThanOrEqual(1);
    expect(field.bucket[39 + 9 * 40]!).toBe(-1);
  });

  it('grows the hot area while the pointer is held', () => {
    const lit = (hold: number): number => {
      const field = new PixelField(60, 20, 12, 12, seeded());
      for (let k = 0; k < 30; k++) field.step(1 / 60, { x: 360, y: 120, active: true, hold });
      return field.bucket.filter((b) => b >= 0).length;
    };
    expect(lit(CHARGE_SECONDS)).toBeGreaterThan(lit(0) * 3);
  });

  it('cools down after the pointer leaves', () => {
    const field = new PixelField(20, 10, 12, 12, seeded());
    for (let k = 0; k < 20; k++) field.step(1 / 60, { x: 100, y: 60, active: true, hold: 1 });
    expect(field.bucket.some((b) => b >= 0)).toBe(true);
    for (let k = 0; k < 60 * 3; k++) field.step(1 / 60, away);
    expect(field.bucket.every((b) => b === -1)).toBe(true);
  });

  it('charges from 0 to 1 over the charge time', () => {
    expect(PixelField.charge(0)).toBe(0);
    expect(PixelField.charge(CHARGE_SECONDS / 2)).toBeCloseTo(0.5);
    expect(PixelField.charge(99)).toBe(1);
  });

  it('explodes: throws pixels outwards, then clears completely', () => {
    const field = new PixelField(20, 10, 12, 12, seeded());
    field.explode(120, 60);
    expect(field.phase).toBe('exploding');
    expect(field.shake()).toBe(1);

    let frames = 0;
    while (field.phase === 'exploding' && frames < 60 * 10) {
      field.step(1 / 60, away);
      frames++;
    }
    expect(field.phase).toBe('cleared');
    expect(frames).toBeLessThan(60 * 6);
    expect(field.shake()).toBe(0);
    expect(field.bucket.every((b) => b === -1)).toBe(true);
  });

  it('kicks pixels away from the origin and colours the debris', () => {
    const field = new PixelField(21, 11, 10, 10, seeded());
    field.explode(105, 55);
    for (let k = 0; k < 6; k++) field.step(1 / 60, away);
    const near = 5 * 21 + 12;
    const centre = 5 * 21 + 10;
    expect(field.attached[centre]).toBe(0);
    expect(field.vx[near]!).toBeGreaterThan(0);
    expect(field.bucket[near]!).toBeGreaterThanOrEqual(0);
  });

  it('ignores a second explosion and can be reset', () => {
    const field = new PixelField(5, 5, 10, 10, seeded());
    field.explode(25, 25);
    field.explode(0, 0);
    field.reset();
    expect(field.phase).toBe('idle');
    expect(field.attached.every((a) => a === 1)).toBe(true);
  });
});
