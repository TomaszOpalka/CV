/**
 * An expanding ring. `advance` moves the front; `passed` tells whether the front crossed a point
 * during the last step, so every point gets kicked exactly once. Units: CSS px and seconds.
 */
export class Shockwave {
  readonly ox: number;
  readonly oy: number;
  readonly speed: number;
  /** Radius of the front after the last `advance`. */
  radius = 0;
  private previous = 0;

  constructor(ox: number, oy: number, speed: number) {
    this.ox = ox;
    this.oy = oy;
    this.speed = speed;
  }

  advance(dt: number): void {
    this.previous = this.radius;
    this.radius += this.speed * dt;
  }

  /** True when a point at `distance` from the origin was reached by the front during the last step. */
  passed(distance: number): boolean {
    return distance >= this.previous && distance <= this.radius;
  }

  /** True once the front is farther than `maxDistance` (nothing is left to hit). */
  done(maxDistance: number): boolean {
    return this.previous > maxDistance;
  }
}
