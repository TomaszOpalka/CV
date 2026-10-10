import { describe, expect, it } from 'vitest';

import type { PointerState } from '../glyph/GlyphField';
import { PixelField } from './PixelField';
import { Shockwave } from './Shockwave';

const away: PointerState = { x: -9999, y: -9999, active: false, radius: 100 };

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
  it('has one pixel per cell, centred in the cell', () => {
    const field = new PixelField(4, 3, 10, seeded());
    expect(field.count).toBe(12);
    expect(field.homeX[0]).toBe(5);
    expect(field.homeY[11]).toBe(25);
  });

  it('keeps levels within 0..1 while idle', () => {
    const field = new PixelField(20, 10, 12, seeded());
    for (let k = 0; k < 120; k++) field.step(1 / 60, { x: 100, y: 60, active: true, radius: 80 });
    for (const level of field.level) {
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });

  it('glows near the pointer', () => {
    const field = new PixelField(20, 10, 12, seeded());
    for (let k = 0; k < 30; k++) field.step(1 / 60, { x: 6, y: 6, active: true, radius: 80 });
    expect(field.level[0]!).toBeGreaterThan(field.level[19 + 9 * 20]!);
  });

  it('explodes: throws pixels outwards, then clears completely', () => {
    const field = new PixelField(20, 10, 12, seeded());
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
  });

  it('kicks pixels away from the origin', () => {
    const field = new PixelField(21, 11, 10, seeded());
    field.explode(105, 55);
    for (let k = 0; k < 6; k++) field.step(1 / 60, away);
    // The pixel at the far right has not been reached yet; one next to the origin flies away.
    const near = 5 * 21 + 12; // two cells right of the centre
    const centre = 5 * 21 + 10;
    expect(field.attached[centre]).toBe(0);
    expect(field.vx[near]!).toBeGreaterThan(0);
  });

  it('ignores a second explosion and can be reset', () => {
    const field = new PixelField(5, 5, 10, seeded());
    field.explode(25, 25);
    field.explode(0, 0);
    field.reset();
    expect(field.phase).toBe('idle');
    expect(field.attached.every((a) => a === 1)).toBe(true);
  });
});
