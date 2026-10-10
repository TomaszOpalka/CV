import { describe, expect, it } from 'vitest';

import { HeatBrush } from './HeatBrush';

const rng = (): number => 0.5;

describe('HeatBrush', () => {
  it('heats a disc with a hot core and cooler edge', () => {
    const brush = new HeatBrush(20, 20, 10, rng);
    brush.stamp(100, 100, 40);
    const centre = 10 * 20 + 10;
    const edge = 10 * 20 + 13;
    expect(brush.heat[centre]!).toBeGreaterThan(brush.heat[edge]!);
    expect(brush.bucket(centre)).toBe(4);
    expect(brush.bucket(10 * 20 + 19)).toBe(-1);
  });

  it('never cools a hotter cell when a weaker stamp lands on it', () => {
    const brush = new HeatBrush(20, 20, 10, rng);
    brush.stamp(100, 100, 40);
    const before = brush.heat[10 * 20 + 10]!;
    brush.stamp(100, 100, 40, 0.3);
    expect(brush.heat[10 * 20 + 10]!).toBe(before);
  });

  it('leaves a continuous band along a fast move', () => {
    const brush = new HeatBrush(60, 10, 10, rng);
    brush.stampSegment(20, 50, 520, 50, 20);
    for (let col = 3; col < 50; col++) expect(brush.heat[5 * 60 + col]!).toBeGreaterThan(0);
  });

  it('cools down to nothing and then costs nothing', () => {
    const brush = new HeatBrush(20, 20, 10, rng);
    brush.stamp(100, 100, 40);
    expect(brush.step(0.05)).toBeGreaterThan(0);
    expect(brush.bounds()).not.toBeNull();
    for (let i = 0; i < 100; i++) brush.step(0.05);
    expect(brush.step(0.05)).toBe(0);
    expect(brush.bounds()).toBeNull();
  });

  it('stays inside the grid when stamped at the border', () => {
    const brush = new HeatBrush(10, 10, 10, rng);
    brush.stamp(-5, 105, 60);
    expect(brush.bounds()).toMatchObject({ minCol: 0, maxRow: 9 });
  });
});
