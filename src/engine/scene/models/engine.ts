import { DEG } from '../math';
import type { Pen } from '../Pen';

/**
 * A V8 as a wire-frame model, in metres, centred on the crankshaft (x along the crank, z up).
 * Eight pistons run on a cross-plane crank: the pistons move for real (crank + connecting-rod
 * geometry), and each cylinder flashes when it fires.
 */
const BORE = 0.062;
const THROW = 0.06;
const ROD = 0.2;
const STATION_X = [-0.3, -0.1, 0.1, 0.3] as const;
const STATION_PHASE = [0, 90, 270, 180] as const;
const AXIS = Math.SQRT1_2;
const SLEEVE_FROM = 0.1;
const SLEEVE_TO = 0.36;
const PISTON_HEIGHT = 0.07;
const RING_POINTS = 14;
const TAU = Math.PI * 2;

const ring = new Float64Array(RING_POINTS * 3);
const pin = new Float64Array(3);
const quad = new Float64Array(12);

/** Ring of `RING_POINTS` points around a cylinder axis (bank side `b`), `s` along the axis. */
function fillRing(x: number, b: number, s: number, radius: number): void {
  const cy = b * AXIS * s;
  const cz = AXIS * s;
  const ny = b * AXIS;
  const nz = -AXIS;
  for (let i = 0; i < RING_POINTS; i++) {
    const phi = (i / RING_POINTS) * TAU;
    const c = Math.cos(phi) * radius;
    ring[i * 3] = x + Math.sin(phi) * radius;
    ring[i * 3 + 1] = cy + c * ny;
    ring[i * 3 + 2] = cz + c * nz;
  }
}

/** Distance of the piston pin from the crank centre along a bank's axis. */
function pistonDistance(pinY: number, pinZ: number, b: number): number {
  const along = pinY * b * AXIS + pinZ * AXIS;
  const perp2 = pinY * pinY + pinZ * pinZ - along * along;
  return along + Math.sqrt(ROD * ROD - perp2);
}

export interface EngineDraw {
  /** Seconds since the engine started. */
  time: number;
  /** Overall opacity 0..1. */
  alpha: number;
  /** Crank speed in revolutions per second. */
  rps: number;
  /** Line width in CSS px. */
  lw: number;
}

/** Crank angle (radians) after `time` seconds when the engine spins up from 0.7 to `rps` over 0.6 s. */
export function crankAngle(time: number, rps: number): number {
  const rise = 0.6;
  const t = Math.max(0, time);
  const base = 0.7 * rps;
  if (t < rise) return TAU * (base * t + ((rps - base) * t * t) / (2 * rise));
  return TAU * (base * rise + ((rps - base) * rise) / 2 + rps * (t - rise));
}

export function drawEngine(pen: Pen, o: EngineDraw): void {
  const ctx = pen.ctx;
  const angle = crankAngle(o.time, o.rps);
  const a = o.alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';

  // --- block: crankcase pan and the two heads (dim) ---
  ctx.globalAlpha = 0.4 * a;
  ctx.lineWidth = o.lw * 0.8;
  ctx.beginPath();
  for (const x of [-0.44, 0.44]) {
    pen.line(x, -0.2, -0.02, x, -0.22, -0.16);
    pen.line(x, -0.22, -0.16, x, -0.12, -0.23);
    pen.line(x, -0.12, -0.23, x, 0.12, -0.23);
    pen.line(x, 0.12, -0.23, x, 0.22, -0.16);
    pen.line(x, 0.22, -0.16, x, 0.2, -0.02);
  }
  for (const [y, z] of [
    [-0.22, -0.16],
    [-0.12, -0.23],
    [0.12, -0.23],
    [0.22, -0.16],
  ] as const) {
    pen.line(-0.44, y, z, 0.44, y, z);
  }
  for (const b of [-1, 1]) {
    // head slab (top of the bank), its two long edges
    for (const side of [-1, 1]) {
      const sy = b * AXIS * SLEEVE_TO + side * 0.1 * b * AXIS;
      const sz = AXIS * SLEEVE_TO - side * 0.1 * AXIS;
      pen.line(-0.44, sy, sz, 0.44, sy, sz);
    }
  }
  ctx.stroke();

  // --- sleeves: two outlines per cylinder ---
  ctx.globalAlpha = 0.7 * a;
  ctx.lineWidth = o.lw * 1.1;
  ctx.beginPath();
  for (const b of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = STATION_X[k]!;
      for (const side of [-1, 1]) {
        const ox = x + side * BORE;
        pen.line(
          ox,
          b * AXIS * SLEEVE_FROM,
          AXIS * SLEEVE_FROM,
          ox,
          b * AXIS * SLEEVE_TO,
          AXIS * SLEEVE_TO,
        );
      }
      fillRing(x, b, SLEEVE_TO, BORE);
      pen.poly(ring, RING_POINTS, true);
    }
  }
  ctx.stroke();

  // --- crankshaft, webs, rods, pistons ---
  for (let k = 0; k < 4; k++) {
    const x = STATION_X[k]!;
    const theta = angle + STATION_PHASE[k]! * DEG;
    pin[0] = x;
    pin[1] = THROW * Math.sin(theta);
    pin[2] = THROW * Math.cos(theta);

    ctx.globalAlpha = 0.9 * a;
    ctx.lineWidth = o.lw * 1.3;
    ctx.beginPath();
    pen.line(x, 0, 0, x, pin[1]!, pin[2]!);
    ctx.stroke();

    for (const b of [-1, 1]) {
      const s = pistonDistance(pin[1]!, pin[2]!, b);
      ctx.globalAlpha = 0.9 * a;
      ctx.lineWidth = o.lw * 1.5;
      ctx.beginPath();
      pen.line(x, pin[1]!, pin[2]!, x, b * AXIS * (s - 0.03), AXIS * (s - 0.03));
      ctx.stroke();

      // piston body: the side silhouette as a filled quad plus the crown
      const top = s;
      const bottom = s - PISTON_HEIGHT;
      quad[0] = x - BORE;
      quad[1] = b * AXIS * bottom;
      quad[2] = AXIS * bottom;
      quad[3] = x + BORE;
      quad[4] = quad[1]!;
      quad[5] = quad[2]!;
      quad[6] = x + BORE;
      quad[7] = b * AXIS * top;
      quad[8] = AXIS * top;
      quad[9] = x - BORE;
      quad[10] = quad[7]!;
      quad[11] = quad[8]!;
      ctx.globalAlpha = 0.7 * a;
      pen.face(quad, 4, false);
      fillRing(x, b, top, BORE);
      ctx.globalAlpha = 1 * a;
      pen.face(ring, RING_POINTS, false);

      // combustion flash on every second stroke
      const cosTdc = (pin[1]! * b * AXIS + pin[2]! * AXIS) / THROW;
      const cycle = Math.floor((angle + STATION_PHASE[k]! * DEG) / TAU) + k + (b > 0 ? 1 : 0);
      if ((cycle & 1) === 0 && cosTdc > 0.5) {
        const flash = (cosTdc - 0.5) / 0.5;
        fillRing(x, b, top + 0.03 + 0.05 * flash, BORE * (0.5 + 0.9 * flash));
        ctx.fillStyle = '#ffa032';
        ctx.globalAlpha = Math.min(1, 1.4 * flash) * a;
        pen.face(ring, RING_POINTS, false);
        ctx.fillStyle = '#fff';
      }
    }
  }

  // crank main axis
  ctx.globalAlpha = 0.9 * a;
  ctx.lineWidth = o.lw * 1.2;
  ctx.beginPath();
  pen.line(-0.46, 0, 0, 0.5, 0, 0);
  ctx.stroke();
}
