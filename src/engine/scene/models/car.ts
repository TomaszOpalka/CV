import { drawEngine } from './engine';
import { Mesh, ring8, type LoftStation } from './loft';
import type { Pen } from '../Pen';

/**
 * A modern (ground-effect era) F1 car in metres: x forward, y to the side, z up. Built from lofted
 * bodies (monocoque with nose, two sidepods, floor, engine cover) plus wings, wheels, halo and
 * suspension. The proportions follow the blueprint: long low nose, high airbox behind the halo, a
 * thin spine that runs back to the rear wing, sidepods that waist in towards the rear.
 */

type Row = readonly number[];

/** [x, halfWidth, topWidth, top, bottom] of the central tub, the nose and the gearbox. */
const MONOCOQUE: ReadonlyArray<Row> = [
  [2.88, 0.05, 0.04, 0.17, 0.1],
  [2.5, 0.07, 0.05, 0.21, 0.1],
  [2.0, 0.11, 0.08, 0.28, 0.09],
  [1.5, 0.17, 0.12, 0.36, 0.08],
  [1.0, 0.23, 0.17, 0.47, 0.08],
  [0.6, 0.28, 0.2, 0.56, 0.08],
  [0.15, 0.3, 0.22, 0.58, 0.08],
  [-0.3, 0.28, 0.2, 0.56, 0.08],
  [-0.75, 0.22, 0.14, 0.5, 0.1],
  [-1.3, 0.2, 0.12, 0.34, 0.1],
  [-2.0, 0.15, 0.1, 0.33, 0.12],
  [-2.5, 0.09, 0.07, 0.36, 0.15],
];

/** [x, centre y, halfWidth, topWidth, top, bottom] of one sidepod (mirrored for the other side). */
const SIDEPOD: ReadonlyArray<Row> = [
  [0.7, 0.5, 0.15, 0.11, 0.44, 0.1],
  [0.3, 0.54, 0.22, 0.17, 0.5, 0.1],
  [-0.2, 0.54, 0.25, 0.2, 0.5, 0.09],
  [-0.7, 0.48, 0.22, 0.16, 0.42, 0.09],
  [-1.2, 0.4, 0.17, 0.11, 0.32, 0.09],
  [-1.7, 0.32, 0.12, 0.08, 0.22, 0.09],
  [-2.05, 0.26, 0.08, 0.05, 0.16, 0.1],
];

/** [x, halfWidth] of the flat floor. */
const FLOOR: ReadonlyArray<Row> = [
  [0.9, 0.42],
  [0.5, 0.64],
  [-0.3, 0.78],
  [-1.2, 0.74],
  [-2.0, 0.62],
  [-2.45, 0.5],
];

/** [x, halfWidth, topWidth, top] of the engine cover: a tent that hides the engine, with the airbox at the front. */
const COVER: ReadonlyArray<Row> = [
  [-0.1, 0.22, 0.08, 0.72],
  [-0.3, 0.3, 0.11, 0.98],
  [-0.8, 0.36, 0.12, 0.94],
  [-1.3, 0.32, 0.09, 0.78],
  [-1.8, 0.2, 0.06, 0.6],
  [-2.35, 0.08, 0.04, 0.48],
];
const COVER_BASE = 0.3;

function tub(rows: ReadonlyArray<Row>): LoftStation[] {
  return rows.map(([x, hw, tw, top, bottom]) => ({
    x: x!,
    ring: ring8(0, hw!, tw!, top!, bottom!, 0.5),
  }));
}

function pod(side: 1 | -1): LoftStation[] {
  return SIDEPOD.map(([x, cy, hw, tw, top, bottom]) => ({
    x: x!,
    ring: ring8(side * cy!, hw!, tw!, top!, bottom!, 0.4),
  }));
}

const GROUPS: ReadonlyArray<ReadonlyArray<LoftStation>> = [
  tub(MONOCOQUE),
  pod(1),
  pod(-1),
  FLOOR.map(([x, hw]) => ({ x: x!, ring: ring8(0, hw!, hw! * 0.95, 0.1, 0.05, 0.5) })),
  COVER.map(([x, hw, tw, top]) => ({ x: x!, ring: ring8(0, hw!, tw!, top!, COVER_BASE, 0.45) })),
];
const COVER_GROUP = 4;

/** Where the engine's crankshaft sits in the car. */
export const ENGINE_AT = { x: -1.2, y: 0, z: 0.5 } as const;

/** Wheel centres (x, y), radius and width. */
const WHEELS: ReadonlyArray<readonly [number, number, number, number]> = [
  [1.75, -0.8, 0.33, 0.34],
  [1.75, 0.8, 0.33, 0.34],
  [-1.7, -0.82, 0.36, 0.42],
  [-1.7, 0.82, 0.36, 0.42],
];

const WHEEL_POINTS = 18;
const SPOKES = 10;
const wheelRing = new Float64Array(WHEEL_POINTS * 3);
const quad = new Float64Array(12);
const TAU = Math.PI * 2;
const TEAL = '#35c4d0';

/** The five depth-sorted pieces: body, four wheels, two wings; details are always drawn last. */
const PART_BODY = 0;
const PART_WHEEL = 1;
const PART_FRONT_WING = 5;
const PART_REAR_WING = 6;
const PART_COUNT = 7;

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
  private readonly mesh = new Mesh(GROUPS);
  private readonly alphas = [0, 0, 0, 0, 0];
  private readonly lifts = [0, 0, 0, 0, 0];
  private readonly order = new Int8Array(PART_COUNT);
  private readonly depth = new Float64Array(PART_COUNT);

  draw(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    pen.at(o.x, 0, 0);

    // The engine sits inside the body and is drawn first.
    if (o.engine > 0.002) {
      const { ox, oy, oz } = pen;
      pen.at(ox + ENGINE_AT.x, oy + ENGINE_AT.y, oz + ENGINE_AT.z);
      drawEngine(pen, { time: o.engineTime, alpha: o.engine, rps: 3, lw: o.lw });
      pen.at(ox, oy, oz);
    }
    if (o.alpha <= 0.002) {
      ctx.globalAlpha = 1;
      pen.at(0, 0, 0);
      return;
    }

    const { alphas, lifts, order, depth } = this;
    for (let g = 0; g < alphas.length; g++) {
      alphas[g] = g === COVER_GROUP ? o.cover * o.alpha : o.alpha;
      lifts[g] = g === COVER_GROUP ? o.coverLift : 0;
    }

    // Everything that can overlap is drawn far to near.
    depth[PART_BODY] = pen.depth(0, 0, 0.3);
    for (let w = 0; w < 4; w++) {
      const [wx, wy, r] = WHEELS[w]!;
      depth[PART_WHEEL + w] = pen.depth(wx, wy, r);
    }
    depth[PART_FRONT_WING] = pen.depth(2.7, 0, 0.1);
    depth[PART_REAR_WING] = pen.depth(-2.75, 0, 0.8);
    for (let i = 0; i < PART_COUNT; i++) order[i] = i;
    for (let i = 1; i < PART_COUNT; i++) {
      const cur = order[i]!;
      let j = i - 1;
      while (j >= 0 && depth[order[j]!]! < depth[cur]!) {
        order[j + 1] = order[j]!;
        j--;
      }
      order[j + 1] = cur;
    }
    for (let k = 0; k < PART_COUNT; k++) {
      const part = order[k]!;
      if (part === PART_BODY)
        this.mesh.draw(pen, { alpha: alphas, lift: lifts, lw: o.lw * 0.8, tint: TEAL });
      else if (part === PART_FRONT_WING) this.drawFrontWing(pen, o);
      else if (part === PART_REAR_WING) this.drawRearWing(pen, o);
      else this.drawWheel(pen, WHEELS[part - PART_WHEEL]!, o);
    }

    this.drawSuspension(pen, o);
    this.drawDetails(pen, o);
    ctx.globalAlpha = 1;
    pen.at(0, 0, 0);
  }

  private drawSuspension(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    ctx.globalAlpha = 0.5 * o.alpha;
    ctx.lineWidth = o.lw * 0.6;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    for (const [wx, wy, r, w] of WHEELS) {
      const side = Math.sign(wy);
      const hubY = wy - side * (w / 2);
      const front = wx > 0;
      const bodyX = front ? 1.45 : -1.4;
      // two wishbones and a push rod
      pen.line(bodyX + 0.22, side * 0.18, 0.2, wx, hubY, r - 0.05);
      pen.line(bodyX - 0.22, side * 0.18, 0.2, wx, hubY, r - 0.05);
      pen.line(bodyX, side * 0.14, 0.46, wx, hubY, r + 0.06);
    }
    ctx.stroke();
  }

  /** Cockpit, halo, helmet, sidepod louvres, airbox intake. */
  private drawDetails(pen: Pen, o: CarDraw): void {
    const { ctx, cam } = pen;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';

    // cockpit opening
    quad.set([0.55, -0.15, 0.585, 0.55, 0.15, 0.585, -0.05, 0.17, 0.585, -0.05, -0.17, 0.585]);
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.95 * o.alpha;
    pen.face(quad, 4, false);
    ctx.globalAlpha = 0.7 * o.alpha;
    ctx.lineWidth = o.lw * 0.8;
    ctx.beginPath();
    pen.poly(quad, 4, true);
    ctx.stroke();

    // louvres on both sidepods
    ctx.globalAlpha = 0.85 * o.alpha;
    ctx.lineWidth = o.lw * 0.7;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const x = -0.15 - i * 0.1;
        pen.line(x, side * 0.5, 0.49 - i * 0.012, x - 0.05, side * 0.62, 0.45 - i * 0.012);
      }
    }
    ctx.stroke();

    // halo: front pillar and two arcs to the rear mounts
    ctx.globalAlpha = 0.95 * o.alpha;
    ctx.lineWidth = o.lw * 1.1;
    ctx.beginPath();
    pen.line(0.58, 0, 0.58, 0.5, 0, 0.82);
    for (const side of [-1, 1]) {
      pen.line(0.5, 0, 0.82, 0.32, side * 0.15, 0.8);
      pen.line(0.32, side * 0.15, 0.8, 0.1, side * 0.24, 0.72);
      pen.line(0.1, side * 0.24, 0.72, -0.1, side * 0.26, 0.6);
    }
    ctx.stroke();

    // helmet
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.9 * o.alpha;
    pen.disc(0.12, 0, 0.66, 0.1);

    // the airbox intake, a black mouth that only shows when seen from the front
    if (cam.posX - pen.ox > -0.1) {
      quad.set([-0.12, -0.09, 0.62, -0.12, 0.09, 0.62, -0.28, 0.1, 0.94, -0.28, -0.1, 0.94]);
      ctx.fillStyle = '#000';
      ctx.globalAlpha = 0.9 * o.cover * o.alpha;
      pen.face(quad, 4, false);
    }
  }

  private drawWheel(pen: Pen, wheel: readonly [number, number, number, number], o: CarDraw): void {
    const { ctx, cam } = pen;
    const [wx, wy, r, w] = wheel;
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
        // rim (inner ring), multi-spoke wheel and the white sidewall stripe
        ctx.globalAlpha = 0.9 * o.alpha;
        ctx.lineWidth = o.lw * 0.8;
        ctx.beginPath();
        for (let s = 0; s < SPOKES; s++) {
          const a = o.spin + (s / SPOKES) * TAU;
          pen.line(wx, y, r, wx + Math.cos(a) * r * 0.62, y, r + Math.sin(a) * r * 0.62);
        }
        for (let i = 0; i < WHEEL_POINTS; i++) {
          const a0 = (i / WHEEL_POINTS) * TAU;
          const a1 = ((i + 1) / WHEEL_POINTS) * TAU;
          pen.line(
            wx + Math.cos(a0) * r * 0.62,
            y,
            r + Math.sin(a0) * r * 0.62,
            wx + Math.cos(a1) * r * 0.62,
            y,
            r + Math.sin(a1) * r * 0.62,
          );
        }
        for (let i = 0; i < 6; i++) {
          const a0 = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7 + o.spin * 0;
          const a1 = Math.PI * 0.15 + ((i + 1) / 6) * Math.PI * 0.7;
          pen.line(
            wx + Math.cos(a0) * r * 0.86,
            y,
            r + Math.sin(a0) * r * 0.86,
            wx + Math.cos(a1) * r * 0.86,
            y,
            r + Math.sin(a1) * r * 0.86,
          );
        }
        ctx.stroke();
      }
    }
  }

  /** Three-element front wing, wider than the tyres, with tall end plates. */
  private drawFrontWing(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    // elements: [x front, x back, z centre, z tip]; the tips curl up outboard
    const elements: ReadonlyArray<readonly [number, number, number, number]> = [
      [2.95, 2.68, 0.06, 0.12],
      [2.86, 2.62, 0.11, 0.2],
      [2.78, 2.56, 0.16, 0.28],
    ];
    for (const [xf, xb, zc, zt] of elements) {
      for (const side of [-1, 1]) {
        quad.set([
          xf,
          0.06 * side,
          zc,
          xb,
          0.06 * side,
          zc,
          xb,
          0.97 * side,
          zt,
          xf,
          0.97 * side,
          zt,
        ]);
        this.wingFace(pen, o, quad, 0.24);
      }
    }
    for (const side of [-1, 1]) {
      quad.set([
        2.5,
        0.98 * side,
        0.03,
        3.0,
        0.98 * side,
        0.03,
        3.0,
        0.98 * side,
        0.2,
        2.5,
        0.98 * side,
        0.36,
      ]);
      this.wingFace(pen, o, quad, 0.2);
    }
  }

  private drawRearWing(pen: Pen, o: CarDraw): void {
    const { ctx } = pen;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    for (const side of [-1, 1]) {
      quad.set([
        -3.0,
        0.54 * side,
        0.5,
        -2.4,
        0.54 * side,
        0.5,
        -2.4,
        0.54 * side,
        1.08,
        -3.0,
        0.54 * side,
        1.02,
      ]);
      this.wingFace(pen, o, quad, 0.22);
    }
    const planes: ReadonlyArray<readonly [number, number, number, number]> = [
      [-2.96, -2.5, 0.84, 0.3],
      [-2.9, -2.58, 0.94, 0.26],
      [-2.9, -2.64, 1.04, 0.2],
    ];
    for (const [x0, x1, z, tint] of planes) {
      quad.set([x0, -0.54, z, x1, -0.54, z, x1, 0.54, z, x0, 0.54, z]);
      this.wingFace(pen, o, quad, tint);
    }
    // beam wing and the pylon that holds the whole thing
    quad.set([-2.8, -0.42, 0.55, -2.5, -0.42, 0.55, -2.5, 0.42, 0.55, -2.8, 0.42, 0.55]);
    this.wingFace(pen, o, quad, 0.16);
    ctx.globalAlpha = 0.7 * o.alpha;
    ctx.lineWidth = o.lw * 0.9;
    ctx.beginPath();
    pen.line(-2.62, 0, 0.45, -2.68, 0, 0.84);
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
    ctx.globalAlpha = 0.8 * o.alpha;
    ctx.lineWidth = o.lw * 0.8;
    ctx.beginPath();
    pen.poly(points, 4, true);
    ctx.stroke();
  }
}
