import type { Pen } from '../Pen';

/** A cross-section of a lofted body: x position, half width, top height, bottom height. */
export type Station = readonly [x: number, halfWidth: number, top: number, bottom: number];

const RING = 6;
/** Direction the light comes from (normalised in the constructor). */
const LIGHT = [-0.35, -0.45, 0.82] as const;

/**
 * A solid-looking wire-frame body made by lofting hexagonal cross-sections along x (the car's hull
 * and engine cover). Faces are depth-sorted every frame and drawn dark with a light tint and bright
 * edges, so the model hides what is behind it without any real hidden-line pass.
 */
export class Loft {
  private readonly verts: Float32Array;
  private readonly faces: number;
  private readonly idx: Uint16Array;
  private readonly centers: Float32Array;
  private readonly normals: Float32Array;
  private readonly depth: Float32Array;
  private readonly order: Uint16Array;
  private readonly quad = new Float64Array(12);
  private readonly front: Uint8Array;
  private readonly stations: number;

  constructor(stations: ReadonlyArray<Station>) {
    const n = stations.length;
    this.verts = new Float32Array(n * RING * 3);
    for (let i = 0; i < n; i++) {
      const [x, w, top, bottom] = stations[i]!;
      const mid = bottom + (top - bottom) * 0.58;
      const ring: Array<[number, number]> = [
        [-0.55 * w, top],
        [0.55 * w, top],
        [w, mid],
        [0.8 * w, bottom],
        [-0.8 * w, bottom],
        [-w, mid],
      ];
      for (let e = 0; e < RING; e++) {
        const o = (i * RING + e) * 3;
        this.verts[o] = x;
        this.verts[o + 1] = ring[e]![0];
        this.verts[o + 2] = ring[e]![1];
      }
    }
    this.stations = n;
    this.faces = (n - 1) * RING;
    this.front = new Uint8Array((n - 1) * RING);
    this.idx = new Uint16Array(this.faces * 4);
    this.centers = new Float32Array(this.faces * 3);
    this.normals = new Float32Array(this.faces * 3);
    this.depth = new Float32Array(this.faces);
    this.order = new Uint16Array(this.faces);

    for (let i = 0; i < n - 1; i++) {
      for (let e = 0; e < RING; e++) {
        const f = i * RING + e;
        const e2 = (e + 1) % RING;
        const a = i * RING + e;
        const b = i * RING + e2;
        const c = (i + 1) * RING + e2;
        const d = (i + 1) * RING + e;
        this.idx.set([a, b, c, d], f * 4);
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (const v of [a, b, c, d]) {
          cx += this.verts[v * 3]! / 4;
          cy += this.verts[v * 3 + 1]! / 4;
          cz += this.verts[v * 3 + 2]! / 4;
        }
        this.centers[f * 3] = cx;
        this.centers[f * 3 + 1] = cy;
        this.centers[f * 3 + 2] = cz;
        // normal = (b - a) x (d - a), flipped to point away from the section's centre line
        const ux = this.verts[b * 3]! - this.verts[a * 3]!;
        const uy = this.verts[b * 3 + 1]! - this.verts[a * 3 + 1]!;
        const uz = this.verts[b * 3 + 2]! - this.verts[a * 3 + 2]!;
        const vx = this.verts[d * 3]! - this.verts[a * 3]!;
        const vy = this.verts[d * 3 + 1]! - this.verts[a * 3 + 1]!;
        const vz = this.verts[d * 3 + 2]! - this.verts[a * 3 + 2]!;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        const midZ = (stations[i]![2] + stations[i]![3]) / 2;
        if (ny * cy + nz * (cz - midZ) < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        this.normals[f * 3] = nx;
        this.normals[f * 3 + 1] = ny;
        this.normals[f * 3 + 2] = nz;
      }
    }
  }

  /** Draw the whole body. `lift` raises it (used while the engine cover drops into place). */
  draw(pen: Pen, alpha: number, lw: number, lift = 0): void {
    if (alpha <= 0.002) return;
    const { ctx } = pen;
    const faces = this.faces;
    const oz = pen.oz;
    pen.oz = oz + lift;

    for (let f = 0; f < faces; f++) {
      this.depth[f] = pen.depth(
        this.centers[f * 3]!,
        this.centers[f * 3 + 1]!,
        this.centers[f * 3 + 2]!,
      );
      this.order[f] = f;
    }
    // far to near (insertion sort: the order barely changes between frames)
    for (let i = 1; i < faces; i++) {
      const cur = this.order[i]!;
      const d = this.depth[cur]!;
      let j = i - 1;
      while (j >= 0 && this.depth[this.order[j]!]! < d) {
        this.order[j + 1] = this.order[j]!;
        j--;
      }
      this.order[j + 1] = cur;
    }

    const cam = pen.cam;
    this.front.fill(0);
    const llen = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = '#fff';
    for (let k = 0; k < faces; k++) {
      const f = this.order[k]!;
      const nx = this.normals[f * 3]!;
      const ny = this.normals[f * 3 + 1]!;
      const nz = this.normals[f * 3 + 2]!;
      const cxw = this.centers[f * 3]! + pen.ox;
      const cyw = this.centers[f * 3 + 1]! + pen.oy;
      const czw = this.centers[f * 3 + 2]! + pen.oz;
      // back-face culling
      const facing = nx * (cam.posX - cxw) + ny * (cam.posY - cyw) + nz * (cam.posZ - czw);
      this.front[f] = facing > 0 ? 1 : 0;
      if (facing <= 0) continue;
      const lit = Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / llen);
      for (let c = 0; c < 4; c++) {
        const v = this.idx[f * 4 + c]! * 3;
        this.quad[c * 3] = this.verts[v]!;
        this.quad[c * 3 + 1] = this.verts[v + 1]!;
        this.quad[c * 3 + 2] = this.verts[v + 2]!;
      }
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 0.94 * alpha;
      if (!pen.face(this.quad, 4, false)) continue;
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = (0.03 + 0.14 * lit) * alpha;
      pen.face(this.quad, 4, false);
      ctx.globalAlpha = 0.4 * alpha;
      ctx.beginPath();
      pen.poly(this.quad, 4, true);
      ctx.stroke();
    }

    // Bold silhouette: a longitudinal edge between a visible and a hidden face, plus the roof line.
    ctx.globalAlpha = 0.95 * alpha;
    ctx.lineWidth = lw * 1.5;
    ctx.beginPath();
    for (let i = 0; i < this.stations - 1; i++) {
      for (let e = 0; e < RING; e++) {
        const here = this.front[i * RING + e]!;
        const before = this.front[i * RING + ((e + RING - 1) % RING)]!;
        const ridge = e === 0 || e === 1;
        if (here === before && !(ridge && here === 1)) continue;
        const a = (i * RING + e) * 3;
        const b = ((i + 1) * RING + e) * 3;
        pen.line(
          this.verts[a]!,
          this.verts[a + 1]!,
          this.verts[a + 2]!,
          this.verts[b]!,
          this.verts[b + 1]!,
          this.verts[b + 2]!,
        );
      }
    }
    ctx.stroke();
    pen.oz = oz;
  }
}
