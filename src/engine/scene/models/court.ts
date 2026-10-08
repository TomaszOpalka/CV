import { HOOP_HEIGHT, RIM_RADIUS } from '../ballFlight';
import type { Pen } from '../Pen';

const TAU = Math.PI * 2;
const pts = new Float64Array(48 * 3);
const quad = new Float64Array(12);
/** Distance from the hoop's centre to the baseline, in metres (FIBA). */
const BASELINE_Y = 1.575;

function arc(
  pen: Pen,
  cx: number,
  cy: number,
  r: number,
  from: number,
  to: number,
  n: number,
): void {
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    pts[i * 3] = cx + Math.cos(a) * r;
    pts[i * 3 + 1] = cy + Math.sin(a) * r;
    pts[i * 3 + 2] = 0;
  }
  pen.poly(pts, n + 1, false);
}

export interface CourtDraw {
  alpha: number;
  lw: number;
}

/**
 * One end of a basketball court (FIBA proportions) lying in the z = 0 plane, with the basket at
 * the origin. The hoop faces the camera at yaw 0; the free throw lane runs towards -y.
 */
export function drawCourt(pen: Pen, o: CourtDraw): void {
  const { ctx } = pen;
  if (o.alpha <= 0.002) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';

  // the painted lane, filled lightly
  ctx.globalAlpha = 0.1 * o.alpha;
  quad.set([
    -2.45,
    BASELINE_Y,
    0,
    2.45,
    BASELINE_Y,
    0,
    2.45,
    BASELINE_Y - 5.8,
    0,
    -2.45,
    BASELINE_Y - 5.8,
    0,
  ]);
  pen.face(quad, 4, false);

  ctx.lineWidth = o.lw;
  ctx.globalAlpha = 0.9 * o.alpha;
  ctx.beginPath();
  // boundary
  pen.line(-7.5, BASELINE_Y, 0, 7.5, BASELINE_Y, 0);
  pen.line(-7.5, BASELINE_Y, 0, -7.5, -9.5, 0);
  pen.line(7.5, BASELINE_Y, 0, 7.5, -9.5, 0);
  // lane
  pen.line(-2.45, BASELINE_Y, 0, -2.45, BASELINE_Y - 5.8, 0);
  pen.line(2.45, BASELINE_Y, 0, 2.45, BASELINE_Y - 5.8, 0);
  pen.line(-2.45, BASELINE_Y - 5.8, 0, 2.45, BASELINE_Y - 5.8, 0);
  // free throw circle (the half towards the centre line is solid)
  arc(pen, 0, BASELINE_Y - 5.8, 1.8, Math.PI, TAU, 24);
  // three point line: arc plus the corner lines
  const corner = 6.6;
  const arcAngle = Math.acos(corner / 6.75);
  arc(pen, 0, 0, 6.75, Math.PI + arcAngle - 0, TAU - arcAngle, 40);
  pen.line(-corner, BASELINE_Y, 0, -corner, -Math.sqrt(6.75 * 6.75 - corner * corner), 0);
  pen.line(corner, BASELINE_Y, 0, corner, -Math.sqrt(6.75 * 6.75 - corner * corner), 0);
  // restricted area under the basket
  arc(pen, 0, 0, 1.25, Math.PI, TAU, 16);
  ctx.stroke();

  // dashed lower half of the free throw circle
  ctx.globalAlpha = 0.55 * o.alpha;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI;
    const a1 = ((i + 0.55) / 8) * Math.PI;
    pen.line(
      Math.cos(a0) * 1.8,
      BASELINE_Y - 5.8 + Math.sin(a0) * 1.8,
      0,
      Math.cos(a1) * 1.8,
      BASELINE_Y - 5.8 + Math.sin(a1) * 1.8,
      0,
    );
  }
  ctx.stroke();

  // floor boards, very faint
  ctx.globalAlpha = 0.05 * o.alpha;
  ctx.lineWidth = o.lw * 0.6;
  ctx.beginPath();
  for (let x = -7; x <= 7; x += 1) pen.line(x, BASELINE_Y, 0, x, -9.5, 0);
  ctx.stroke();
}

/** Backboard, support arm, rim and net. `alpha` fades the whole thing in. */
export function drawHoop(pen: Pen, o: CourtDraw): void {
  const { ctx } = pen;
  if (o.alpha <= 0.002) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  const boardY = RIM_RADIUS + 0.15;

  // support arm going back from the board (the post itself would only clutter the view)
  ctx.globalAlpha = 0.6 * o.alpha;
  ctx.lineWidth = o.lw * 1.2;
  ctx.beginPath();
  pen.line(0, boardY, HOOP_HEIGHT + 0.25, 0, BASELINE_Y + 1.4, HOOP_HEIGHT + 0.5);
  ctx.stroke();

  // backboard
  quad.set([
    -0.9,
    boardY,
    HOOP_HEIGHT - 0.15,
    0.9,
    boardY,
    HOOP_HEIGHT - 0.15,
    0.9,
    boardY,
    HOOP_HEIGHT + 0.9,
    -0.9,
    boardY,
    HOOP_HEIGHT + 0.9,
  ]);
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.9 * o.alpha;
  pen.face(quad, 4, false);
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.14 * o.alpha;
  pen.face(quad, 4, false);
  ctx.globalAlpha = 0.95 * o.alpha;
  ctx.lineWidth = o.lw;
  ctx.beginPath();
  pen.poly(quad, 4, true);
  // the inner square
  pen.line(-0.3, boardY, HOOP_HEIGHT - 0.05, 0.3, boardY, HOOP_HEIGHT - 0.05);
  pen.line(0.3, boardY, HOOP_HEIGHT - 0.05, 0.3, boardY, HOOP_HEIGHT + 0.4);
  pen.line(0.3, boardY, HOOP_HEIGHT + 0.4, -0.3, boardY, HOOP_HEIGHT + 0.4);
  pen.line(-0.3, boardY, HOOP_HEIGHT + 0.4, -0.3, boardY, HOOP_HEIGHT - 0.05);
  ctx.stroke();

  // net
  ctx.globalAlpha = 0.5 * o.alpha;
  ctx.lineWidth = o.lw * 0.7;
  ctx.beginPath();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const b = ((i + 0.5) / n) * TAU;
    const c = ((i + 1) / n) * TAU;
    pen.line(
      Math.cos(a) * RIM_RADIUS,
      Math.sin(a) * RIM_RADIUS,
      HOOP_HEIGHT,
      Math.cos(b) * RIM_RADIUS * 0.62,
      Math.sin(b) * RIM_RADIUS * 0.62,
      HOOP_HEIGHT - 0.22,
    );
    pen.line(
      Math.cos(b) * RIM_RADIUS * 0.62,
      Math.sin(b) * RIM_RADIUS * 0.62,
      HOOP_HEIGHT - 0.22,
      Math.cos(c) * RIM_RADIUS,
      Math.sin(c) * RIM_RADIUS,
      HOOP_HEIGHT,
    );
  }
  ctx.stroke();

  // rim (orange, like the real thing)
  ctx.strokeStyle = '#ff9632';
  ctx.globalAlpha = 1 * o.alpha;
  ctx.lineWidth = o.lw * 1.5;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    const b = ((i + 1) / 24) * TAU;
    pen.line(
      Math.cos(a) * RIM_RADIUS,
      Math.sin(a) * RIM_RADIUS,
      HOOP_HEIGHT,
      Math.cos(b) * RIM_RADIUS,
      Math.sin(b) * RIM_RADIUS,
      HOOP_HEIGHT,
    );
  }
  ctx.stroke();
}
