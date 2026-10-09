import { BALL_RADIUS } from '../ballFlight';
import type { Pen } from '../Pen';

const ORANGE = '#ff9632';
const YELLOW = '#ffd050';
const N = 30;
const TAU = Math.PI * 2;
const local = new Float64Array(3);
const centre = new Float64Array(3);

/** Seam curves of a basketball: each is a closed loop on the unit sphere. */
function seamPoint(curve: number, i: number, out: Float64Array): void {
  const a = (i / N) * TAU;
  const c = Math.cos(a);
  const s = Math.sin(a);
  switch (curve) {
    case 0: // equator
      out[0] = c;
      out[1] = s;
      out[2] = 0;
      return;
    case 1: // meridian
      out[0] = c;
      out[1] = 0;
      out[2] = s;
      return;
    default: {
      // the two curved side seams: circles in planes offset from the centre
      const side = curve === 2 ? 1 : -1;
      const offset = 0.55 * side;
      const r = Math.sqrt(1 - offset * offset);
      out[0] = offset;
      out[1] = r * c;
      out[2] = r * s;
    }
  }
}

export interface BallDraw {
  x: number;
  y: number;
  z: number;
  /** Spin angle (radians) about the ball's own axis. */
  spin: number;
  /** Overall opacity. */
  alpha: number;
  /** Opacity of the seams (they are the first thing to disappear when it turns into the reactor). */
  seams: number;
  lw: number;
  /** 0..1 squash when it hits the floor, 0..1 stretch along its fall. */
  squash?: number;
  stretch?: number;
}

/**
 * A basketball: an orange disc with dark seams that turn with `spin`. Returns the disc's radius in
 * screen px (the reactor is drawn at that size when the ball turns into it), or -1 if not visible.
 */
export function drawBall(pen: Pen, o: BallDraw): number {
  const { ctx, cam } = pen;
  if (o.alpha <= 0.002) return -1;
  const squash = o.squash ?? 0;
  const stretch = o.stretch ?? 0;
  const deformed = squash > 0.01 || stretch > 0.01;
  if (deformed) {
    // Squash and stretch happen in screen space, around the ball's centre.
    if (!cam.project(o.x, o.y, o.z, centre)) return -1;
    ctx.save();
    ctx.translate(centre[0]!, centre[1]!);
    ctx.scale(1 + 0.5 * squash - 0.2 * stretch, 1 - 0.42 * squash + 0.38 * stretch);
    ctx.translate(-centre[0]!, -centre[1]!);
  }
  ctx.fillStyle = ORANGE;
  ctx.globalAlpha = 0.42 * o.alpha;
  const radius = pen.disc(o.x, o.y, o.z, BALL_RADIUS);
  if (radius < 0) {
    if (deformed) ctx.restore();
    return -1;
  }
  // a lighter patch gives the disc some volume
  ctx.fillStyle = YELLOW;
  ctx.globalAlpha = 0.14 * o.alpha;
  pen.disc(o.x - BALL_RADIUS * 0.28, o.y, o.z + BALL_RADIUS * 0.3, BALL_RADIUS * 0.6);

  if (o.seams > 0.01) {
    const cs = Math.cos(o.spin);
    const sn = Math.sin(o.spin);
    const tilt = 0.5;
    const ct = Math.cos(tilt);
    const st = Math.sin(tilt);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = o.lw * 2;
    ctx.globalAlpha = 1 * o.alpha * o.seams;
    ctx.lineCap = 'round';
    const toCamX = cam.posX - o.x;
    const toCamY = cam.posY - o.y;
    const toCamZ = cam.posZ - o.z;
    const toCamLen = Math.hypot(toCamX, toCamY, toCamZ) || 1;
    ctx.beginPath();
    for (let curve = 0; curve < 4; curve++) {
      let prevVisible = false;
      let px = 0;
      let py = 0;
      let pz = 0;
      for (let i = 0; i <= N; i++) {
        seamPoint(curve, i % N, local);
        // spin about z, then a fixed tilt about x
        const x1 = local[0]! * cs - local[1]! * sn;
        const y1 = local[0]! * sn + local[1]! * cs;
        const z1 = local[2]!;
        const y2 = y1 * ct - z1 * st;
        const z2 = y1 * st + z1 * ct;
        const wx = o.x + x1 * BALL_RADIUS;
        const wy = o.y + y2 * BALL_RADIUS;
        const wz = o.z + z2 * BALL_RADIUS;
        const visible = (x1 * toCamX + y2 * toCamY + z2 * toCamZ) / toCamLen > 0.08;
        if (visible && prevVisible) pen.line(px, py, pz, wx, wy, wz);
        prevVisible = visible;
        px = wx;
        py = wy;
        pz = wz;
      }
    }
    ctx.stroke();
  }

  // bright rim
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = o.lw * 1.6;
  ctx.globalAlpha = 1 * o.alpha;
  pen.circle(o.x, o.y, o.z, BALL_RADIUS);
  ctx.globalAlpha = 1;
  if (deformed) ctx.restore();
  return radius;
}
