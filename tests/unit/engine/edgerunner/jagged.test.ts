import { describe, expect, it } from 'vitest';

import { jaggedPolygon, makeJaggedEdge } from '@/engine/edgerunner/jagged';
import { mulberry32 } from '@/engine/edgerunner/lightning';

describe('jagged edge', () => {
  it('runs left to right from 0 to 100 and stays within the amplitude', () => {
    const edge = makeJaggedEdge(mulberry32(11), 20);
    expect(edge[0]!.x).toBe(0);
    expect(edge[edge.length - 1]!.x).toBe(100);
    for (let i = 1; i < edge.length; i++) expect(edge[i]!.x).toBeGreaterThanOrEqual(edge[i - 1]!.x);
    for (const point of edge) {
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(20);
    }
  });

  it('is reproducible for a seed, different for another', () => {
    expect(makeJaggedEdge(mulberry32(2), 18)).toEqual(makeJaggedEdge(mulberry32(2), 18));
    expect(makeJaggedEdge(mulberry32(2), 18)).not.toEqual(makeJaggedEdge(mulberry32(3), 18));
  });

  it('has real steps, not just a straight line', () => {
    const depths = new Set(makeJaggedEdge(mulberry32(5), 24).map((p) => p.y));
    expect(depths.size).toBeGreaterThan(2);
  });

  it('builds a closed polygon with the top going right and the bottom coming back', () => {
    const top = [
      { x: 0, y: 4 },
      { x: 100, y: 4 },
    ];
    const bottom = [
      { x: 0, y: 9 },
      { x: 100, y: 9 },
    ];
    expect(jaggedPolygon(top, bottom)).toBe(
      'polygon(0% 4px, 100% 4px, 100% calc(100% - 9px), 0% calc(100% - 9px))',
    );
  });
});
