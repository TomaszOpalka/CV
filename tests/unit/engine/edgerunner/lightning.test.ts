import { describe, expect, it } from 'vitest';

import { makeBolt, makeBranches, mulberry32, randomTarget } from '@/engine/edgerunner/lightning';

describe('lightning', () => {
  const from = { x: 100, y: 50 };
  const to = { x: 700, y: 650 };

  it('is reproducible for a given seed', () => {
    expect(makeBolt(from, to, mulberry32(7))).toEqual(makeBolt(from, to, mulberry32(7)));
    expect(makeBolt(from, to, mulberry32(7))).not.toEqual(makeBolt(from, to, mulberry32(8)));
  });

  it('keeps its end points and has 2^detail + 1 points', () => {
    const bolt = makeBolt(from, to, mulberry32(1), 5);
    expect(bolt).toHaveLength(33);
    expect(bolt[0]).toEqual(from);
    expect(bolt[bolt.length - 1]).toEqual(to);
  });

  it('wanders off the straight line but not wildly', () => {
    const bolt = makeBolt(from, to, mulberry32(3));
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const sides = bolt.map(
      (p) => ((to.x - from.x) * (p.y - from.y) - (to.y - from.y) * (p.x - from.x)) / length,
    );
    expect(Math.max(...sides.map(Math.abs))).toBeGreaterThan(3);
    expect(Math.max(...sides.map(Math.abs))).toBeLessThan(length * 0.5);
  });

  it('forks branches that start on the bolt', () => {
    const rng = mulberry32(5);
    const bolt = makeBolt(from, to, rng);
    const branches = makeBranches(bolt, rng, 4);
    expect(branches).toHaveLength(4);
    for (const branch of branches) {
      expect(bolt).toContainEqual(branch[0]);
      expect(branch.length).toBeGreaterThan(2);
    }
    expect(makeBranches([from, to], rng, 3)).toEqual([]);
  });

  it('picks targets at the requested distance', () => {
    const origin = { x: 10, y: 20 };
    const target = randomTarget(origin, 200, mulberry32(9));
    expect(Math.hypot(target.x - origin.x, target.y - origin.y)).toBeCloseTo(200, 5);
  });
});
