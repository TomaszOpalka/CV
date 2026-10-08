import { drawEngine } from './engine';
import { Loft, type Station } from './loft';
import type { Pen } from '../Pen';

/** Hull of an F1 car in metres: x forward, y to the side, z up. Stations are (x, half width, top, bottom). */
const HULL: ReadonlyArray<Station> = [
  [-2.55, 0.07, 0.4, 0.18],
  [-2.1, 0.14, 0.34, 0.12],
  [-1.6, 0.24, 0.32, 0.08],
  [-1.0, 0.3, 0.32, 0.08],
  [-0.55, 0.4, 0.34, 0.08],
  [-0.1, 0.5, 0.48, 0.08],
  [0.4, 0.52, 0.52, 0.08],
  [0.9, 0.4, 0.42, 0.08],
  [1.5, 0.24, 0.34, 0.1],
  [2.15, 0.14, 0.28, 0.12],
  [2.85, 0.06, 0.22, 0.14],
];

/** The engine cover and air box sitting on the hull's engine bay. */
const COVER: ReadonlyArray<Station> = [
  [-2.3, 0.07, 0.44, 0.31],
  [-1.95, 0.16, 0.62, 0.31],
  [-1.55, 0.27, 0.82, 0.31],
  [-1.15, 0.34, 0.96, 0.31],
  [-0.8, 0.36, 0.92, 0.31],
  [-0.45, 0.33, 0.7, 0.31],
  [-0.15, 0.26, 0.5, 0.31],
];

/** Where the engine's crankshaft sits in the car. */
export const ENGINE_AT = { x: -1.2, y: 0, z: 0.5 } as const;

const WHEEL_POINTS = 16;
const wheelRing = new Float64Array(WHEEL_POINTS * 3);
const quad = new Float64Array(12);
const TAU = Math.PI * 2;

export interface CarDraw {
  /** Distance driven along x (the whole car is shifted by it). */
  x: number;
  /** Wheel rotation in radians. */
  spin: number;
  alpha: number;
  /** Engine opacity (it is hidden once the cover is on). */
  engine: number;
  /** Time passed to the engine animation. */
  engineTime: number;
  /** 0..1 opacity of the cover and how high above its seat it hovers (metres). */
  cover: number;
  coverLift: number;
  lw: number;
}

export class Car {
  private readonly hull = new Loft(HULL);
  private readonly cover = new Loft(COVER);

  draw(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    pen.at(o.x, 0, 0);

    // The engine sits inside the hull and is drawn first.
    if (o.engine > 0.002) {
      const ox = pen.ox;
      const oy = pen.oy;
      const oz = pen.oz;
      pen.at(ox + ENGINE_AT.x, oy + ENGINE_AT.y, oz + ENGINE_AT.z);
      drawEngine(pen, { time: o.engineTime, alpha: o.engine, rps: 1.5, lw: o.lw });
      pen.at(ox, oy, oz);
    }

    if (o.alpha <= 0.002) {
      ctx.globalAlpha = 1;
      pen.at(0, 0, 0);
      return;
    }
    this.hull.draw(pen, o.alpha, o.lw * 0.8);
    this.drawWing(pen, o);
    this.drawSuspension(pen, o);
    for (const [wx, wy, r, w] of WHEELS) this.drawWheel(pen, wx, wy, r, w, o);
    this.drawHalo(pen, o);
    this.cover.draw(pen, o.cover * o.alpha, o.lw * 0.8, o.coverLift);

    ctx.globalAlpha = 1;
    pen.at(0, 0, 0);
  }

  private drawSuspension(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    ctx.globalAlpha = 0.5 * o.alpha;
    ctx.lineWidth = o.lw * 0.7;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    for (const [wx, wy, r, w] of WHEELS) {
      const side = Math.sign(wy);
      const hubY = wy - side * (w / 2);
      for (const dx of [-0.2, 0.2]) {
        pen.line(wx + dx, side * 0.32, 0.2, wx, hubY, r);
      }
    }
    ctx.stroke();
  }

  private drawWheel(pen: Pen, wx: number, wy: number, r: number, w: number, o: CarDraw): void {
    const { ctx, cam } = pen;
    const yA = wy - w / 2;
    const yB = wy + w / 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';

    // Tread band: back-face culled quads around the axle (the axle is parallel to y).
    for (let i = 0; i < WHEEL_POINTS; i++) {
      const a0 = (i / WHEEL_POINTS) * TAU + o.spin;
      const a1 = ((i + 1) / WHEEL_POINTS) * TAU + o.spin;
      const am = (a0 + a1) / 2;
      const nx = Math.cos(am);
      const nz = Math.sin(am);
      const cxw = wx + pen.ox + nx * r;
      const czw = r + pen.oz + nz * r;
      const facing = nx * (cam.posX - cxw) + nz * (cam.posZ - czw);
      if (facing <= 0) continue;
      quad[0] = wx + Math.cos(a0) * r;
      quad[1] = yA;
      quad[2] = r + Math.sin(a0) * r;
      quad[3] = wx + Math.cos(a1) * r;
      quad[4] = yA;
      quad[5] = r + Math.sin(a1) * r;
      quad[6] = quad[3]!;
      quad[7] = yB;
      quad[8] = quad[5]!;
      quad[9] = quad[0]!;
      quad[10] = yB;
      quad[11] = quad[2]!;
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 0.95 * o.alpha;
      if (!pen.face(quad, 4, false)) continue;
      // alternating light/dark blocks make the rotation readable
      if (i % 2 === 0) {
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.16 * o.alpha;
        pen.face(quad, 4, false);
      }
    }

    // The visible side face: the one whose normal (+-y) points at the camera.
    const outerY = cam.posY - pen.oy < wy ? yA : yB;
    const farY = outerY === yA ? yB : yA;
    for (const y of [farY, outerY]) {
      const visible = y === outerY;
      for (let i = 0; i < WHEEL_POINTS; i++) {
        const a = (i / WHEEL_POINTS) * TAU;
        wheelRing[i * 3] = wx + Math.cos(a) * r;
        wheelRing[i * 3 + 1] = y;
        wheelRing[i * 3 + 2] = r + Math.sin(a) * r;
      }
      if (visible) {
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.95 * o.alpha;
        pen.face(wheelRing, WHEEL_POINTS, false);
      }
      ctx.globalAlpha = (visible ? 1 : 0.45) * o.alpha;
      ctx.lineWidth = o.lw * 1.3;
      ctx.beginPath();
      pen.poly(wheelRing, WHEEL_POINTS, true);
      ctx.stroke();
      if (visible) {
        // rim, hub and rotating spokes
        ctx.globalAlpha = 0.8 * o.alpha;
        ctx.lineWidth = o.lw * 0.7;
        ctx.beginPath();
        for (let s = 0; s < 5; s++) {
          const a = o.spin + (s / 5) * TAU;
          pen.line(wx, y, r, wx + Math.cos(a) * r * 0.72, y, r + Math.sin(a) * r * 0.72);
        }
        for (let i = 0; i < WHEEL_POINTS; i++) {
          const a0 = (i / WHEEL_POINTS) * TAU;
          const a1 = ((i + 1) / WHEEL_POINTS) * TAU;
          pen.line(
            wx + Math.cos(a0) * r * 0.72,
            y,
            r + Math.sin(a0) * r * 0.72,
            wx + Math.cos(a1) * r * 0.72,
            y,
            r + Math.sin(a1) * r * 0.72,
          );
        }
        ctx.stroke();
      }
    }
  }

  private drawWing(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    // front wing: two planes and the end plates
    for (const [x0, x1, z] of [
      [2.5, 2.8, 0.1],
      [2.58, 2.76, 0.18],
    ] as const) {
      quad.set([x0, -0.9, z, x1, -0.9, z, x1, 0.9, z, x0, 0.9, z]);
      this.wingFace(pen, o, quad, z > 0.15 ? 0.2 : 0.3);
    }
    for (const y of [-0.9, 0.9]) {
      quad.set([2.45, y, 0.04, 2.95, y, 0.04, 2.95, y, 0.3, 2.45, y, 0.3]);
      this.wingFace(pen, o, quad, 0.2);
    }
    // rear wing
    for (const y of [-0.55, 0.55]) {
      quad.set([-2.95, y, 0.55, -2.25, y, 0.55, -2.25, y, 1.02, -2.95, y, 1.02]);
      this.wingFace(pen, o, quad, 0.2);
    }
    for (const [x0, x1, z] of [
      [-2.88, -2.3, 0.82],
      [-2.85, -2.5, 0.96],
    ] as const) {
      quad.set([x0, -0.55, z, x1, -0.55, z, x1, 0.55, z, x0, 0.55, z]);
      this.wingFace(pen, o, quad, z > 0.9 ? 0.25 : 0.32);
    }
    ctx.globalAlpha = 0.6 * o.alpha;
    ctx.lineWidth = o.lw * 0.8;
    ctx.beginPath();
    pen.line(-2.55, 0, 0.4, -2.55, 0, 0.82);
    ctx.stroke();
  }

  private wingFace(pen: Pen, o: CarDraw, points: Float64Array, tint: number): void {
    const { ctx } = pen;
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.9 * o.alpha;
    if (!pen.face(points, 4, false)) return;
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = tint * o.alpha;
    pen.face(points, 4, false);
    ctx.globalAlpha = 0.7 * o.alpha;
    ctx.lineWidth = o.lw * 0.8;
    ctx.beginPath();
    pen.poly(points, 4, true);
    ctx.stroke();
  }

  private drawHalo(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = 0.85 * o.alpha;
    ctx.lineWidth = o.lw;
    ctx.beginPath();
    pen.line(0.55, -0.16, 0.5, 0.22, -0.2, 0.82);
    pen.line(0.22, -0.2, 0.82, -0.12, 0, 0.9);
    pen.line(-0.12, 0, 0.9, 0.22, 0.2, 0.82);
    pen.line(0.22, 0.2, 0.82, 0.55, 0.16, 0.5);
    pen.line(0.55, 0, 0.52, 0.2, 0, 0.88);
    ctx.stroke();
    // helmet
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.9 * o.alpha;
    pen.disc(0.1, 0, 0.66, 0.1);
  }
}

/** Wheel centres (x, y), radius and width. Front wheels first. */
const WHEELS: ReadonlyArray<readonly [number, number, number, number]> = [
  [1.75, -0.8, 0.33, 0.3],
  [1.75, 0.8, 0.33, 0.3],
  [-1.7, -0.8, 0.36, 0.4],
  [-1.7, 0.8, 0.36, 0.4],
];
