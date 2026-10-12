import type { Pen } from '../Pen';

/** A cross-section: closed ring of (y, z) points. Every station of one group has the same number of points. */
export type Ring = ReadonlyArray<readonly [y: number, z: number]>;
export interface LoftStation {
  x: number;
  ring: Ring;
}

/**
 * Ring of eight points: a rounded box (or a tent when `topWidth` is smaller than `halfWidth`),
 * centred at `cy`, between heights `bottom` and `top`. `shoulder` is how far down (0..1) the
 * widest part starts.
 */
export function ring8(
  cy: number,
  halfWidth: number,
  topWidth: number,
  top: number,
  bottom: number,
  shoulder = 0.35,
): Ring {
  const h = top - bottom;
  const shoulderZ = top - h * shoulder;
  const lowZ = bottom + h * 0.15;
  return [
    [cy - topWidth, top],
    [cy + topWidth, top],
    [cy + halfWidth, shoulderZ],
    [cy + halfWidth, lowZ],
    [cy + halfWidth * 0.8, bottom],
    [cy - halfWidth * 0.8, bottom],
    [cy - halfWidth, lowZ],
    [cy - halfWidth, shoulderZ],
  ];
}

/** Direction the light comes from (not normalised). */
const LIGHT = [-0.35, -0.45, 0.82] as const;
const LIGHT_LENGTH = Math.hypot(LIGHT[0], LIGHT[1], LIGHT[2]);

interface Group {
  stations: number;
  ringSize: number;
  firstFace: number;
}

export interface MeshDraw {
  /** Opacity of every group (0 = not drawn). */
  alpha: ReadonlyArray<number>;
  /** How far each group hovers above its seat (metres). */
  lift: ReadonlyArray<number>;
  lw: number;
  /** Colour of the light tint on lit faces. */
  tint: string;
}

/**
 * Solid-looking wire-frame bodies made by lofting cross-sections along x (a car's nose, sidepods,
 * floor and engine cover are one group each). All faces of all groups are depth-sorted together every
 * frame and drawn dark with a light tint and bright edges, so the model hides what is behind it
 * without a real hidden-line pass. Silhouette edges are drawn bolder.
 */
export class Mesh {
  private readonly groups: Group[] = [];
  private readonly verts: Float32Array;
  private readonly vertexOffset: number[] = [];
  private readonly faces: number;
  private readonly idx: Uint32Array;
  private readonly groupOf: Uint8Array;
  private readonly centers: Float32Array;
  private readonly normals: Float32Array;
  private readonly depth: Float32Array;
  private readonly order: Uint16Array;
  private readonly front: Uint8Array;
  private readonly quad = new Float64Array(12);

  constructor(groups: ReadonlyArray<ReadonlyArray<LoftStation>>) {
    let vertexTotal = 0;
    let faceTotal = 0;
    for (const g of groups) {
      this.vertexOffset.push(vertexTotal);
      const ringSize = g[0]!.ring.length;
      this.groups.push({ stations: g.length, ringSize, firstFace: faceTotal });
      vertexTotal += g.length * ringSize;
      faceTotal += (g.length - 1) * ringSize;
    }
    this.verts = new Float32Array(vertexTotal * 3);
    this.faces = faceTotal;
    this.idx = new Uint32Array(faceTotal * 4);
    this.groupOf = new Uint8Array(faceTotal);
    this.centers = new Float32Array(faceTotal * 3);
    this.normals = new Float32Array(faceTotal * 3);
    this.depth = new Float32Array(faceTotal);
    this.order = new Uint16Array(faceTotal);
    this.front = new Uint8Array(faceTotal);

    groups.forEach((g, gi) => {
      const { ringSize, firstFace } = this.groups[gi]!;
      const base = this.vertexOffset[gi]!;
      g.forEach((station, si) => {
        station.ring.forEach(([y, z], e) => {
          const o = (base + si * ringSize + e) * 3;
          this.verts[o] = station.x;
          this.verts[o + 1] = y;
          this.verts[o + 2] = z;
        });
      });
      for (let si = 0; si < g.length - 1; si++) {
        for (let e = 0; e < ringSize; e++) {
          const f = firstFace + si * ringSize + e;
          const e2 = (e + 1) % ringSize;
          const a = base + si * ringSize + e;
          const b = base + si * ringSize + e2;
          const c = base + (si + 1) * ringSize + e2;
          const d = base + (si + 1) * ringSize + e;
          this.idx.set([a, b, c, d], f * 4);
          this.groupOf[f] = gi;
          this.shapeFace(f, g[si]!.ring);
        }
      }
    });
  }

  private shapeFace(f: number, ring: Ring): void {
    const { verts, idx } = this;
    const [a, b, c, d] = [idx[f * 4]!, idx[f * 4 + 1]!, idx[f * 4 + 2]!, idx[f * 4 + 3]!];
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const v of [a, b, c, d]) {
      cx += verts[v * 3]! / 4;
      cy += verts[v * 3 + 1]! / 4;
      cz += verts[v * 3 + 2]! / 4;
    }
    this.centers[f * 3] = cx;
    this.centers[f * 3 + 1] = cy;
    this.centers[f * 3 + 2] = cz;
    const ux = verts[b * 3]! - verts[a * 3]!;
    const uy = verts[b * 3 + 1]! - verts[a * 3 + 1]!;
    const uz = verts[b * 3 + 2]! - verts[a * 3 + 2]!;
    const vx = verts[d * 3]! - verts[a * 3]!;
    const vy = verts[d * 3 + 1]! - verts[a * 3 + 1]!;
    const vz = verts[d * 3 + 2]! - verts[a * 3 + 2]!;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    // point away from the middle of the cross-section
    let my = 0;
    let mz = 0;
    for (const [y, z] of ring) {
      my += y / ring.length;
      mz += z / ring.length;
    }
    if (ny * (cy - my) + nz * (cz - mz) < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    this.normals[f * 3] = nx;
    this.normals[f * 3 + 1] = ny;
    this.normals[f * 3 + 2] = nz;
  }

  draw(pen: Pen, o: MeshDraw): void {
    const { ctx, cam } = pen;
    const { faces, order, depth, front } = this;
    const baseZ = pen.oz;
    let any = false;
    for (let f = 0; f < faces; f++) {
      const g = this.groupOf[f]!;
      order[f] = f;
      front[f] = 0;
      if (o.alpha[g]! <= 0.002) {
        depth[f] = -1e9;
        continue;
      }
      any = true;
      depth[f] = pen.depth(
        this.centers[f * 3]!,
        this.centers[f * 3 + 1]!,
        this.centers[f * 3 + 2]! + o.lift[g]!,
      );
    }
    if (!any) return;
    // far to near (insertion sort: the order barely changes between frames)
    for (let i = 1; i < faces; i++) {
      const cur = order[i]!;
      const d = depth[cur]!;
      let j = i - 1;
      while (j >= 0 && depth[order[j]!]! < d) {
        order[j + 1] = order[j]!;
        j--;
      }
      order[j + 1] = cur;
    }

    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    for (let k = 0; k < faces; k++) {
      const f = order[k]!;
      const g = this.groupOf[f]!;
      const alpha = o.alpha[g]!;
      if (alpha <= 0.002) continue;
      const nx = this.normals[f * 3]!;
      const ny = this.normals[f * 3 + 1]!;
      const nz = this.normals[f * 3 + 2]!;
      const lift = o.lift[g]!;
      const cxw = this.centers[f * 3]! + pen.ox;
      const cyw = this.centers[f * 3 + 1]! + pen.oy;
      const czw = this.centers[f * 3 + 2]! + baseZ + lift;
      const facing = nx * (cam.posX - cxw) + ny * (cam.posY - cyw) + nz * (cam.posZ - czw);
      if (facing <= 0) continue;
      front[f] = 1;
      const lit = Math.max(0, (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / LIGHT_LENGTH);
      for (let c = 0; c < 4; c++) {
        const v = this.idx[f * 4 + c]! * 3;
        this.quad[c * 3] = this.verts[v]!;
        this.quad[c * 3 + 1] = this.verts[v + 1]!;
        this.quad[c * 3 + 2] = this.verts[v + 2]!;
      }
      pen.oz = baseZ + lift;
      ctx.lineWidth = o.lw;
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 0.94 * alpha;
      if (!pen.face(this.quad, 4, false)) continue;
      ctx.fillStyle = o.tint;
      ctx.globalAlpha = (0.03 + 0.16 * lit) * alpha;
      pen.face(this.quad, 4, false);
      ctx.globalAlpha = 0.4 * alpha;
      ctx.beginPath();
      pen.poly(this.quad, 4, true);
      ctx.stroke();
    }

    // Bold silhouette: a longitudinal edge between a visible and a hidden face, plus the top edges.
    ctx.lineWidth = o.lw * 1.3;
    for (let gi = 0; gi < this.groups.length; gi++) {
      const alpha = o.alpha[gi]!;
      if (alpha <= 0.002) continue;
      const { stations, ringSize, firstFace } = this.groups[gi]!;
      const base = this.vertexOffset[gi]!;
      pen.oz = baseZ + o.lift[gi]!;
      ctx.globalAlpha = 0.95 * alpha;
      ctx.beginPath();
      for (let i = 0; i < stations - 1; i++) {
        for (let e = 0; e < ringSize; e++) {
          const here = this.front[firstFace + i * ringSize + e]!;
          const before = this.front[firstFace + i * ringSize + ((e + ringSize - 1) % ringSize)]!;
          const ridge = (gi === 0 || gi === 4) && (e === 0 || e === 1);
          if (here === before && !(ridge && here === 1)) continue;
          const a = (base + i * ringSize + e) * 3;
          const b = (base + (i + 1) * ringSize + e) * 3;
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
    }
    pen.oz = baseZ;
  }
}
