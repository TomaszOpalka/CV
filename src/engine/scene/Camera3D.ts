import { DEG } from './math';

/**
 * A perspective orbit camera. World axes: x right (the car's nose points to +x), y into the scene,
 * z up. `yaw` 0 looks along +y (a side view of the car), 90 looks along -x (head-on at the nose);
 * `pitch` 0 is level, 90 looks straight down. `roll` turns the picture counter-clockwise.
 * `zoom` is pixels per world unit for things at the target's distance.
 */
export class Camera3D {
  yaw = 0;
  pitch = 0;
  roll = 0;
  dist = 10;
  tx = 0;
  ty = 0;
  tz = 0;
  zoom = 100;
  /** Screen centre in CSS px. */
  cx = 0;
  cy = 0;
  near = 0.05;

  private px = 0;
  private py = 0;
  private pz = 0;
  private rx = 1;
  private ry = 0;
  private ux = 0;
  private uy = 0;
  private uz = 1;
  private fx = 0;
  private fy = 1;
  private fz = 0;
  private cosR = 1;
  private sinR = 0;

  /** Recompute the basis after changing any parameter. */
  update(): void {
    const yaw = this.yaw * DEG;
    const pitch = this.pitch * DEG;
    const roll = this.roll * DEG;
    const sy = Math.sin(yaw);
    const cy = Math.cos(yaw);
    const sp = Math.sin(pitch);
    const cp = Math.cos(pitch);
    this.px = this.tx + this.dist * sy * cp;
    this.py = this.ty - this.dist * cy * cp;
    this.pz = this.tz + this.dist * sp;
    this.fx = -sy * cp;
    this.fy = cy * cp;
    this.fz = -sp;
    this.rx = cy;
    this.ry = sy;
    this.ux = -sy * sp;
    this.uy = cy * sp;
    this.uz = cp;
    this.cosR = Math.cos(roll);
    this.sinR = Math.sin(roll);
  }

  /** World -> camera space (x right, y up, z depth). */
  toCam(x: number, y: number, z: number, out: Float64Array): void {
    const dx = x - this.px;
    const dy = y - this.py;
    const dz = z - this.pz;
    out[0] = dx * this.rx + dy * this.ry;
    out[1] = dx * this.ux + dy * this.uy + dz * this.uz;
    out[2] = dx * this.fx + dy * this.fy + dz * this.fz;
  }

  /** Camera space -> screen. `out` = [sx, sy, pixels per unit at this depth]. Needs depth > 0. */
  toScreen(xc: number, yc: number, zc: number, out: Float64Array): void {
    const k = (this.zoom * this.dist) / zc;
    const xr = xc * this.cosR - yc * this.sinR;
    const yr = xc * this.sinR + yc * this.cosR;
    out[0] = this.cx + xr * k;
    out[1] = this.cy - yr * k;
    out[2] = k;
  }

  /** World -> screen in one step. Returns false for points behind the near plane. */
  project(x: number, y: number, z: number, out: Float64Array): boolean {
    this.toCam(x, y, z, out);
    const zc = out[2]!;
    if (zc < this.near) return false;
    this.toScreen(out[0]!, out[1]!, zc, out);
    return true;
  }

  /** Distance from the camera plane (depth) of a world point; for sorting. */
  depth(x: number, y: number, z: number): number {
    return (x - this.px) * this.fx + (y - this.py) * this.fy + (z - this.pz) * this.fz;
  }

  get position(): readonly [number, number, number] {
    return [this.px, this.py, this.pz];
  }

  get posX(): number {
    return this.px;
  }
  get posY(): number {
    return this.py;
  }
  get posZ(): number {
    return this.pz;
  }
}
