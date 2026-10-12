import type { Camera3D } from './Camera3D';

/**
 * Draws 3D lines and polygons through a Camera3D onto a 2D context. All coordinates are shifted by
 * (ox, oy, oz) first, so one model can be placed anywhere (the car drives by moving that offset).
 * Scratch vectors are reused: nothing is allocated per call.
 */
export class Pen {
  ox = 0;
  oy = 0;
  oz = 0;
  /**
   * Oblique shear: a point at depth x also moves by (x * skewY, x * skewZ). With a head-on camera this
   * gives the classic "cabinet" look, where slices at different x are stacked slightly apart.
   */
  skewY = 0;
  skewZ = 0;
  private readonly a = new Float64Array(3);
  private readonly b = new Float64Array(3);
  private readonly sa = new Float64Array(3);
  private readonly sb = new Float64Array(3);
  private readonly quadX = new Float64Array(8);
  private readonly quadY = new Float64Array(8);

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly cam: Camera3D,
  ) {}

  /** Move to the origin of a model. */
  at(x: number, y: number, z: number): this {
    this.ox = x;
    this.oy = y;
    this.oz = z;
    return this;
  }

  /** Adds a segment to the current path (clipped against the near plane). */
  line(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
    const { cam, a, b, sa, sb } = this;
    cam.toCam(x1 + this.ox, y1 + this.oy + x1 * this.skewY, z1 + this.oz + x1 * this.skewZ, a);
    cam.toCam(x2 + this.ox, y2 + this.oy + x2 * this.skewY, z2 + this.oz + x2 * this.skewZ, b);
    const near = cam.near;
    if (a[2]! < near && b[2]! < near) return;
    if (a[2]! < near) {
      const t = (near - a[2]!) / (b[2]! - a[2]!);
      a[0] = a[0]! + (b[0]! - a[0]!) * t;
      a[1] = a[1]! + (b[1]! - a[1]!) * t;
      a[2] = near;
    } else if (b[2]! < near) {
      const t = (near - b[2]!) / (a[2]! - b[2]!);
      b[0] = b[0]! + (a[0]! - b[0]!) * t;
      b[1] = b[1]! + (a[1]! - b[1]!) * t;
      b[2] = near;
    }
    cam.toScreen(a[0]!, a[1]!, a[2]!, sa);
    cam.toScreen(b[0]!, b[1]!, b[2]!, sb);
    this.ctx.moveTo(sa[0]!, sa[1]!);
    this.ctx.lineTo(sb[0]!, sb[1]!);
  }

  /** Polyline through `n` points of a flat [x, y, z, ...] array. */
  poly(points: ArrayLike<number>, n: number, close = false): void {
    for (let i = 0; i + 1 < n; i++) {
      this.line(
        points[i * 3]!,
        points[i * 3 + 1]!,
        points[i * 3 + 2]!,
        points[i * 3 + 3]!,
        points[i * 3 + 4]!,
        points[i * 3 + 5]!,
      );
    }
    if (close && n > 2) {
      const l = (n - 1) * 3;
      this.line(points[l]!, points[l + 1]!, points[l + 2]!, points[0]!, points[1]!, points[2]!);
    }
  }

  /**
   * Fills (and optionally strokes) a planar polygon given as flat xyz points, with the current
   * fill style. Skipped when any corner is behind the camera. Returns whether it was drawn.
   */
  face(points: ArrayLike<number>, n: number, stroke: boolean): boolean {
    const { cam, a, ctx } = this;
    for (let i = 0; i < n; i++) {
      const px = points[i * 3]!;
      const py = points[i * 3 + 1]! + this.oy + px * this.skewY;
      const pz = points[i * 3 + 2]! + this.oz + px * this.skewZ;
      if (!cam.project(px + this.ox, py, pz, a)) return false;
      this.quadX[i] = a[0]!;
      this.quadY[i] = a[1]!;
    }
    ctx.beginPath();
    ctx.moveTo(this.quadX[0]!, this.quadY[0]!);
    for (let i = 1; i < n; i++) ctx.lineTo(this.quadX[i]!, this.quadY[i]!);
    ctx.closePath();
    ctx.fill();
    if (stroke) ctx.stroke();
    return true;
  }

  /** Filled circle (a billboard sphere) with world radius `r` at a world point. Returns its screen radius or -1. */
  disc(x: number, y: number, z: number, r: number): number {
    const { cam, a, ctx } = this;
    if (!cam.project(x + this.ox, y + this.oy + x * this.skewY, z + this.oz + x * this.skewZ, a))
      return -1;
    const radius = r * a[2]!;
    ctx.beginPath();
    ctx.arc(a[0]!, a[1]!, radius, 0, Math.PI * 2);
    ctx.fill();
    return radius;
  }

  /** Outline of a billboard circle (world radius `r`). Returns its screen radius or -1. */
  circle(x: number, y: number, z: number, r: number): number {
    const { cam, a, ctx } = this;
    if (!cam.project(x + this.ox, y + this.oy + x * this.skewY, z + this.oz + x * this.skewZ, a))
      return -1;
    const radius = r * a[2]!;
    ctx.beginPath();
    ctx.arc(a[0]!, a[1]!, radius, 0, Math.PI * 2);
    ctx.stroke();
    return radius;
  }

  /** Depth of a world point (plus the model offset). */
  depth(x: number, y: number, z: number): number {
    return this.cam.depth(x + this.ox, y + this.oy, z + this.oz);
  }
}
