/**
 * Pure physics helpers for the glyph field. All values are in CSS pixels and seconds.
 * Hot-path functions mutate typed arrays in place so the frame loop never allocates.
 */

/** Smooth falloff: 1 at distance 0, 0 at `radius` and beyond (quadratic ease). */
export function falloff(distance: number, radius: number): number {
  if (distance >= radius) return 0;
  const t = 1 - distance / radius;
  return t * t;
}

/** Initial speed an explosion gives a particle at `distance` from its origin. */
export function explosionSpeed(distance: number, strength: number, spread: number): number {
  return strength * Math.exp(-distance / spread);
}

/** Multiplicative velocity damping for exponential drag, independent of frame rate. */
export function dragFactor(rate: number, dt: number): number {
  return Math.exp(-rate * dt);
}

/**
 * One semi-implicit Euler step of a damped spring pulling `pos[i]` towards `target`.
 * `damping` is a linear drag coefficient (1/s). Stable for stiffness * dt^2 << 1.
 */
export function springStep(
  pos: Float32Array,
  vel: Float32Array,
  i: number,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): void {
  const v = (vel[i]! + (target - pos[i]!) * stiffness * dt) * Math.max(0, 1 - damping * dt);
  vel[i] = v;
  pos[i] = pos[i]! + v * dt;
}
