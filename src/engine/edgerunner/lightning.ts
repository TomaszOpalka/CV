export interface Point {
  x: number;
  y: number;
}

export type Rng = () => number;

/** Small seeded generator (mulberry32), so bolts can be reproduced in tests. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A jagged lightning bolt from `from` to `to` by midpoint displacement: every pass splits each segment and pushes
 * the new middle point sideways. `detail` passes give 2^detail + 1 points; the ends stay exactly where they are.
 */
export function makeBolt(from: Point, to: Point, rng: Rng, detail = 6, roughness = 0.24): Point[] {
  let points: Point[] = [from, to];
  let offset = Math.hypot(to.x - from.x, to.y - from.y) * roughness;
  for (let pass = 0; pass < detail; pass++) {
    const next: Point[] = [points[0]!];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy) || 1;
      const shift = (rng() - 0.5) * 2 * offset;
      next.push({
        x: (a.x + b.x) / 2 - (dy / length) * shift,
        y: (a.y + b.y) / 2 + (dx / length) * shift,
      });
      next.push(b);
    }
    points = next;
    offset *= 0.55;
  }
  return points;
}

/** Side branches forking off a bolt: each picks a point on the bolt and runs off at a sharp angle. */
export function makeBranches(
  bolt: readonly Point[],
  rng: Rng,
  count: number,
  lengthFactor = 0.3,
): Point[][] {
  const branches: Point[][] = [];
  if (bolt.length < 8) return branches;
  const first = bolt[0]!;
  const last = bolt[bolt.length - 1]!;
  const total = Math.hypot(last.x - first.x, last.y - first.y);
  for (let i = 0; i < count; i++) {
    const index = 2 + Math.floor(rng() * (bolt.length - 4));
    const origin = bolt[index]!;
    const heading =
      Math.atan2(last.y - first.y, last.x - first.x) + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.7);
    const reach = total * lengthFactor * (0.4 + rng() * 0.6);
    branches.push(
      makeBolt(
        origin,
        { x: origin.x + Math.cos(heading) * reach, y: origin.y + Math.sin(heading) * reach },
        rng,
        4,
        0.28,
      ),
    );
  }
  return branches;
}

/** A target on a circle of the given radius around `origin`, at a random angle (optionally within `spread`). */
export function randomTarget(
  origin: Point,
  radius: number,
  rng: Rng,
  centre = 0,
  spread = Math.PI,
): Point {
  const angle = centre + (rng() - 0.5) * 2 * spread;
  return { x: origin.x + Math.cos(angle) * radius, y: origin.y + Math.sin(angle) * radius };
}
