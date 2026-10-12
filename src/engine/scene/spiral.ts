/**
 * The smoke vortex: a golden (Fibonacci) spiral built from quarter arcs whose radii shrink as
 * 8, 5, 3, 2, 1. It winds up, and then closes into the outline of the basketball: the outer arcs
 * become the circle, the third arc (radius 3) becomes the seam across the ball.
 */

const PHI = (1 + Math.sqrt(5)) / 2;
/** Radii of the quarter arcs (Fibonacci numbers, largest first). */
export const FIBONACCI_ARCS = [8, 5, 3, 2, 1] as const;

const TOTAL = FIBONACCI_ARCS.reduce((sum, r) => sum + r, 0);
/** Where each arc ends along the spiral, as a share of its length (cumulative). */
const BOUNDS: number[] = [0];
for (const r of FIBONACCI_ARCS) BOUNDS.push(BOUNDS[BOUNDS.length - 1]! + r / TOTAL);
/** The seam arc: the third one, radius 3. */
export const SEAM_FROM = BOUNDS[2]!;
export const SEAM_TO = BOUNDS[3]!;

/** Spiral radius shrinks by PHI every quarter turn: five quarter turns from `outer` to `outer / PHI^5`. */
const INNER_SHARE = Math.pow(PHI, -5);

/**
 * Point on the open spiral. `s` runs 0 (outer end, at the tyre) .. 1 (the eye). Returns [x, z] relative
 * to the vortex centre; `start` is the angle of the outer end, `turn` an extra rotation, `dir` the
 * winding direction (1 counter-clockwise, -1 its mirror image).
 */
export function spiralOpen(
  s: number,
  outer: number,
  start: number,
  turn: number,
  out: Float64Array | number[],
  dir: 1 | -1 = 1,
): void {
  // r falls linearly with s, so points are spaced evenly along the path.
  const r = outer * (1 - s * (1 - INNER_SHARE));
  const theta = ((Math.PI / 2) * Math.log(outer / r)) / Math.log(PHI);
  const a = start + dir * (theta + turn);
  out[0] = Math.cos(a) * r;
  out[1] = Math.sin(a) * r;
}

/** Where `s` ends up when the vortex has closed into a ball of radius `radius`. */
export function spiralClosed(
  s: number,
  radius: number,
  start: number,
  out: Float64Array | number[],
  dir: 1 | -1 = 1,
): void {
  if (s >= SEAM_FROM && s <= SEAM_TO) {
    const t = (s - SEAM_FROM) / (SEAM_TO - SEAM_FROM);
    out[0] = dir * Math.sin(t * Math.PI * 2) * radius * 0.3;
    out[1] = (1 - 2 * t) * radius;
    return;
  }
  const seam = SEAM_TO - SEAM_FROM;
  const u = (s < SEAM_FROM ? s : s - seam) / (1 - seam);
  const a = start + dir * u * Math.PI * 2;
  out[0] = Math.cos(a) * radius;
  out[1] = Math.sin(a) * radius;
}

/** Open spiral (k = 0) blended into the closed ball (k = 1) while the whole thing keeps turning. */
export function spiralMorph(
  s: number,
  k: number,
  outer: number,
  ballRadius: number,
  start: number,
  out: Float64Array | number[],
  scratch: Float64Array | number[],
  dir: 1 | -1 = 1,
): void {
  const e = k * k * (3 - 2 * k);
  spiralOpen(s, outer, start, e * Math.PI * 2.2, out, dir);
  spiralClosed(s, ballRadius, start + dir * e * Math.PI * 2.2, scratch, dir);
  out[0] = out[0]! + (scratch[0]! - out[0]!) * e;
  out[1] = out[1]! + (scratch[1]! - out[1]!) * e;
}
