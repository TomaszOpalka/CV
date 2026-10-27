import type { Rng } from './lightning';

export interface EdgePoint {
  /** Position along the edge, 0..100 (%). */
  x: number;
  /** Depth into the band, 0..amplitude (px). */
  y: number;
}

/**
 * The ragged edge of the interference band: long flat runs, then a diagonal slope or a sudden vertical step to
 * another depth, like `----\___/\__/---|/---`. Points run left to right and the first and last sit at 0 and 100.
 */
export function makeJaggedEdge(rng: Rng, amplitude: number, runs = 22): EdgePoint[] {
  const levels = [0, amplitude * 0.3, amplitude * 0.6, amplitude];
  const points: EdgePoint[] = [];
  let x = 0;
  let y = levels[Math.floor(rng() * levels.length)]!;
  points.push({ x, y });
  while (x < 100) {
    // Flat run.
    x = Math.min(100, x + (100 / runs) * (0.4 + rng() * 1.6));
    points.push({ x, y });
    if (x >= 100) break;
    // Then a change of depth: sloped (spans some distance) or a vertical step.
    const next = levels[Math.floor(rng() * levels.length)]!;
    if (next === y) continue;
    if (rng() < 0.55) x = Math.min(100, x + 0.4 + rng() * 1.4);
    y = next;
    points.push({ x, y });
  }
  const last = points[points.length - 1]!;
  if (last.x < 100) points.push({ x: 100, y: last.y });
  return points;
}

/** CSS `clip-path` polygon that cuts a ragged top and bottom edge out of a box. */
export function jaggedPolygon(top: readonly EdgePoint[], bottom: readonly EdgePoint[]): string {
  const f = (n: number): string => Number(n.toFixed(2)).toString();
  const upper = top.map((p) => `${f(p.x)}% ${f(p.y)}px`);
  const lower = [...bottom].reverse().map((p) => `${f(p.x)}% calc(100% - ${f(p.y)}px)`);
  return `polygon(${[...upper, ...lower].join(', ')})`;
}
