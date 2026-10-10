import { clamp01, easeOutCubic, hash1, ramp, smoothstep } from '../math';

const TAU = Math.PI * 2;

/** Stroke colours; the digit shader turns them into palettes (see `classifyColor`). */
const WHITE = '#fff';
const CYAN = '#5ae1ff';
const GREEN = '#46ff80';
const FIRE = '#ff9632';
const YELLOW = '#ffd050';

/** Screen-space drawing of the "hero" object at the centre: reactor, Death Star, beam, explosion. */
export interface Hero {
  cx: number;
  cy: number;
  /** Radius in CSS px of the object's disc. */
  radius: number;
  /** Line width in CSS px. */
  lw: number;
}

function ringPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, TAU);
}

/** Annular sector as a filled + stroked path. */
function sector(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r1, a0, a1);
  ctx.arc(cx, cy, r0, a1, a0, true);
  ctx.closePath();
}

export interface ReactorDraw {
  /** Seconds since the reactor appeared (drives all the rotation). */
  time: number;
  /** 0 -> 1 builds the reactor from the core outwards. */
  build: number;
  /** 0..1 how much of the mechanism around the core (rings, pistons) is shown. */
  mechanism: number;
}

/**
 * An arc reactor: a glowing core, a rotating triangle, a ring of coils, an outer ring with ticks and,
 * around it, counter-rotating rings of dashes and pistons that move in and out like a mechanism.
 */
export function drawReactor(ctx: CanvasRenderingContext2D, h: Hero, o: ReactorDraw): void {
  const { cx, cy, radius: R, lw } = h;
  const t = o.time;
  const pulse = 0.88 + 0.12 * Math.sin(t * 6);
  const core = smoothstep(0, 0.3, o.build);
  const tri = smoothstep(0.15, 0.45, o.build);
  const coils = smoothstep(0.3, 0.7, o.build);
  const outer = smoothstep(0.5, 0.9, o.build);
  ctx.strokeStyle = CYAN;
  ctx.fillStyle = CYAN;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // core glow: stacked discs
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    ctx.globalAlpha = 0.1 * core * pulse;
    ctx.beginPath();
    ctx.arc(cx, cy, R * (0.4 - i * 0.05), 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = WHITE;
  ctx.globalAlpha = core * pulse;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CYAN;

  // rotating triangle inside a ring
  if (tri > 0.01) {
    ctx.globalAlpha = 0.9 * tri;
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ringPath(ctx, cx, cy, R * 0.42);
    for (let i = 0; i < 3; i++) {
      const a = t * 0.9 + (i / 3) * TAU - Math.PI / 2;
      const b = t * 0.9 + ((i + 1) / 3) * TAU - Math.PI / 2;
      ctx.moveTo(cx + Math.cos(a) * R * 0.42, cy + Math.sin(a) * R * 0.42);
      ctx.lineTo(cx + Math.cos(b) * R * 0.42, cy + Math.sin(b) * R * 0.42);
    }
    ctx.stroke();
  }

  // ring of coils
  if (coils > 0.01) {
    const n = 10;
    const gap = 0.16;
    for (let i = 0; i < n; i++) {
      const a0 = -t * 0.8 + (i / n) * TAU + gap / 2;
      const a1 = -t * 0.8 + ((i + 1) / n) * TAU - gap / 2;
      sector(ctx, cx, cy, R * 0.55, R * 0.76, a0, a1);
      ctx.globalAlpha = 0.3 * coils;
      ctx.fillStyle = CYAN;
      ctx.fill();
      ctx.globalAlpha = 0.95 * coils;
      ctx.lineWidth = lw * 0.9;
      ctx.strokeStyle = WHITE;
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7 * coils;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    ringPath(ctx, cx, cy, R * 0.5);
    ctx.stroke();
  }

  // outer ring with ticks
  if (outer > 0.01) {
    ctx.strokeStyle = WHITE;
    ctx.globalAlpha = 1 * outer;
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath();
    ringPath(ctx, cx, cy, R * 0.9);
    ctx.stroke();
    ctx.globalAlpha = 0.8 * outer;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    for (let i = 0; i < 48; i++) {
      const a = t * 0.25 + (i / 48) * TAU;
      ctx.moveTo(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8);
      ctx.lineTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86);
    }
    ctx.stroke();
  }

  // the mechanism around it
  const m = o.mechanism;
  if (m > 0.01) {
    ctx.strokeStyle = WHITE;
    const rings: Array<[number, number, number, number]> = [
      [1.14, 28, 0.5, 0.55],
      [1.32, 36, -0.35, 0.5],
      [1.56, 48, 0.22, 0.45],
    ];
    ctx.lineWidth = lw * 1.3;
    for (const [rr, n, speed, fill] of rings) {
      ctx.globalAlpha = 0.75 * m;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = t * speed + (i / n) * TAU;
        const arc = (TAU / n) * fill;
        ctx.moveTo(cx + Math.cos(a) * R * rr, cy + Math.sin(a) * R * rr);
        ctx.arc(cx, cy, R * rr, a, a + arc);
      }
      ctx.stroke();
    }
    // pistons: radial bars sliding in and out
    ctx.lineWidth = lw * 2;
    ctx.globalAlpha = 0.85 * m;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 0.12;
      const slide = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      const r0 = R * (0.96 + 0.1 * slide);
      const r1 = r0 + R * 0.12;
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    }
    ctx.stroke();
    // a pulse wave leaving the core
    ctx.strokeStyle = CYAN;
    const wave = (t * 0.7) % 1;
    ctx.globalAlpha = 0.5 * m * (1 - wave);
    ctx.lineWidth = lw;
    ctx.beginPath();
    ringPath(ctx, cx, cy, R * (1 + 1.6 * easeOutCubic(wave)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Slowly drifting lines behind the hero ("the background moves a little"). */
export function drawDrift(
  ctx: CanvasRenderingContext2D,
  w: number,
  hgt: number,
  time: number,
  alpha: number,
  lw: number,
): void {
  if (alpha <= 0.002) return;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = lw * 0.8;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let i = 0; i < 26; i++) {
    const y = hash1(i * 3.1) * hgt;
    const len = (0.05 + 0.18 * hash1(i * 7.7)) * w;
    const speed = (0.02 + 0.05 * hash1(i * 5.3)) * w * (i % 2 === 0 ? 1 : -1);
    const x = ((((hash1(i * 1.9) * w + speed * time) % (w + len)) + w + len) % (w + len)) - len;
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Vertical speed streaks that sell the fall: the background rushes upwards. */
export function drawStreaks(
  ctx: CanvasRenderingContext2D,
  w: number,
  hgt: number,
  time: number,
  intensity: number,
  lw: number,
): void {
  if (intensity <= 0.002) return;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  for (let i = 0; i < 34; i++) {
    const x = hash1(i * 2.3) * w;
    const len = hgt * (0.1 + 0.3 * hash1(i * 4.1)) * (0.4 + intensity);
    const speed = hgt * (0.6 + 1.6 * hash1(i * 6.7)) * intensity;
    const span = hgt + len * 2;
    const y = hgt + len - ((((hash1(i * 9.1) * span + speed * time) % span) + span) % span);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
  }
  ctx.globalAlpha = 0.32 * Math.min(1, intensity * 1.5);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export interface DeathStarDraw {
  /** Longitude (radians) of the superlaser dish: 0 faces the viewer, negative is hidden behind the left limb. */
  dishLongitude: number;
  alpha: number;
  /** 0..1 charge of the superlaser: rays converge on the dish and its centre glows. */
  charge: number;
  /** Seconds, for the small animations. */
  time: number;
}

const TILT = 0.2;
/** The whole sphere is rolled so the trench runs diagonally (a level trench plus a round dish looks like a Pokeball). */
const ROLL = -0.5;
const DISH_LATITUDE = 0.5;
const DISH_ANGLE = 0.4;

const COS_ROLL = Math.cos(ROLL);
const SIN_ROLL = Math.sin(ROLL);

/** Tilts a point on the unit sphere towards the viewer, rolls it, and writes screen-space (x, y, depth). */
function sphereToScreen(x: number, y: number, z: number, out: Float64Array): void {
  const ct = Math.cos(TILT);
  const st = Math.sin(TILT);
  const ty = y * ct - z * st;
  out[0] = x * COS_ROLL - ty * SIN_ROLL;
  out[1] = x * SIN_ROLL + ty * COS_ROLL;
  out[2] = y * st + z * ct;
}

const sv = new Float64Array(3);
const dv = new Float64Array(3);

/** A curve on the sphere's surface (given by `point(i)`), drawn only where it faces the viewer. */
function surfaceCurve(
  ctx: CanvasRenderingContext2D,
  h: Hero,
  n: number,
  point: (i: number, out: Float64Array) => void,
  close: boolean,
): void {
  let prevVisible = false;
  let px = 0;
  let py = 0;
  const last = close ? n : n - 1;
  for (let i = 0; i <= last; i++) {
    point(i % n, sv);
    const sx = h.cx + sv[0]! * h.radius;
    const sy = h.cy - sv[1]! * h.radius;
    const visible = sv[2]! > 0.02;
    if (visible && prevVisible) {
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
    }
    prevVisible = visible;
    px = sx;
    py = sy;
  }
}

/** The dish direction on the unit sphere before the tilt. */
function dishCenter(longitude: number, out: Float64Array): void {
  out[0] = Math.cos(DISH_LATITUDE) * Math.sin(longitude);
  out[1] = Math.sin(DISH_LATITUDE);
  out[2] = Math.cos(DISH_LATITUDE) * Math.cos(longitude);
}

/** Screen position (CSS px) of the dish centre; the beam starts here. */
export function dishScreenPosition(h: Hero, longitude: number, out: Float64Array): void {
  dishCenter(longitude, dv);
  sphereToScreen(dv[0]!, dv[1]!, dv[2]!, out);
  out[0] = h.cx + out[0]! * h.radius;
  out[1] = h.cy - out[1]! * h.radius;
}

export function drawDeathStar(ctx: CanvasRenderingContext2D, h: Hero, o: DeathStarDraw): void {
  const { cx, cy, radius: R, lw } = h;
  if (o.alpha <= 0.002) return;
  ctx.strokeStyle = WHITE;
  ctx.fillStyle = WHITE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // shaded sphere: stacked discs creeping towards the light
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, TAU);
  ctx.fillStyle = '#000';
  ctx.globalAlpha = o.alpha;
  ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.05 * o.alpha;
    ctx.beginPath();
    ctx.arc(cx - R * 0.06 * i, cy - R * 0.06 * i, R * (1 - i * 0.14), 0, TAU);
    ctx.fill();
  }

  const turn = o.dishLongitude * 0.35; // the surface turns with the dish, but slower
  ctx.lineWidth = lw * 0.8;
  // latitude lines
  ctx.globalAlpha = 0.45 * o.alpha;
  ctx.beginPath();
  for (const lat of [-1.0, -0.55, 0.3, 0.8, 1.15]) {
    surfaceCurve(
      ctx,
      h,
      48,
      (i, out) => {
        const a = (i / 48) * TAU;
        sphereToScreen(
          Math.cos(lat) * Math.sin(a),
          Math.sin(lat),
          Math.cos(lat) * Math.cos(a),
          out,
        );
      },
      true,
    );
  }
  // meridians (they carry the surface turning)
  for (let m = 0; m < 9; m++) {
    const lon = turn + (m / 9) * TAU;
    surfaceCurve(
      ctx,
      h,
      28,
      (i, out) => {
        const lat = -Math.PI / 2 + (i / 27) * Math.PI;
        sphereToScreen(
          Math.cos(lat) * Math.sin(lon),
          Math.sin(lat),
          Math.cos(lat) * Math.cos(lon),
          out,
        );
      },
      false,
    );
  }
  ctx.stroke();

  // equatorial trench: two bright lines with small ribs across
  ctx.globalAlpha = 0.7 * o.alpha;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  for (let k = 0; k < 56; k++) {
    const lon = turn * 1.4 + (k / 56) * TAU;
    surfaceCurve(
      ctx,
      h,
      2,
      (i, out) => {
        const lat = i === 0 ? -0.06 : 0.06;
        sphereToScreen(
          Math.cos(lat) * Math.sin(lon),
          Math.sin(lat),
          Math.cos(lat) * Math.cos(lon),
          out,
        );
      },
      false,
    );
  }
  ctx.stroke();
  ctx.globalAlpha = 1 * o.alpha;
  ctx.lineWidth = lw * 1.6;
  ctx.beginPath();
  for (const lat of [-0.06, 0.06]) {
    surfaceCurve(
      ctx,
      h,
      64,
      (i, out) => {
        const a = (i / 64) * TAU;
        sphereToScreen(
          Math.cos(lat) * Math.sin(a),
          Math.sin(lat),
          Math.cos(lat) * Math.cos(a),
          out,
        );
      },
      true,
    );
  }
  ctx.stroke();

  // the superlaser dish
  const d = dv;
  dishCenter(o.dishLongitude, d);
  sphereToScreen(d[0]!, d[1]!, d[2]!, sv);
  if (sv[2]! > -DISH_ANGLE) {
    // orthonormal basis on the sphere around the dish centre
    let ux = -d[2]!;
    const uy = 0;
    let uz = d[0]!;
    const ul = Math.hypot(ux, uz) || 1;
    ux /= ul;
    uz /= ul;
    const vx = d[1]! * uz - d[2]! * uy;
    const vy = d[2]! * ux - d[0]! * uz;
    const vz = d[0]! * uy - d[1]! * ux;
    const rim =
      (scale: number): ((i: number, out: Float64Array) => void) =>
      (i, out) => {
        const a = (i / 40) * TAU;
        const sa = Math.sin(DISH_ANGLE * scale);
        const ca = Math.cos(DISH_ANGLE * scale);
        sphereToScreen(
          d[0]! * ca + (ux * Math.cos(a) + vx * Math.sin(a)) * sa,
          d[1]! * ca + (uy * Math.cos(a) + vy * Math.sin(a)) * sa,
          d[2]! * ca + (uz * Math.cos(a) + vz * Math.sin(a)) * sa,
          out,
        );
      };
    // dark bowl
    ctx.beginPath();
    let first = true;
    const rimFn = rim(1);
    for (let i = 0; i < 40; i++) {
      rimFn(i, sv);
      if (sv[2]! < 0) continue;
      const sx = cx + sv[0]! * R;
      const sy = cy - sv[1]! * R;
      if (first) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
      first = false;
    }
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 0.92 * o.alpha;
    ctx.fill();
    ctx.globalAlpha = o.alpha;
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    surfaceCurve(ctx, h, 40, rimFn, true);
    ctx.stroke();
    ctx.globalAlpha = 0.6 * o.alpha;
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath();
    surfaceCurve(ctx, h, 40, rim(0.62), true);
    surfaceCurve(ctx, h, 40, rim(0.3), true);
    ctx.stroke();

    // charging: rays converge on the dish and its centre glows
    sphereToScreen(d[0]!, d[1]!, d[2]!, sv);
    const dx = cx + sv[0]! * R;
    const dy = cy - sv[1]! * R;
    const facing = Math.max(0, sv[2]!);
    if (o.charge > 0.01 && facing > 0.1) {
      ctx.strokeStyle = GREEN;
      ctx.globalAlpha = 0.95 * o.charge * facing;
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + o.time * 0.5;
        const far = R * 0.5 * (1 - o.charge) + R * 0.12;
        ctx.moveTo(
          dx + Math.cos(a) * (far + R * 0.18) * facing,
          dy + Math.sin(a) * (far + R * 0.18) * facing,
        );
        ctx.lineTo(dx + Math.cos(a) * far * facing, dy + Math.sin(a) * far * facing);
      }
      ctx.stroke();
      ctx.fillStyle = GREEN;
      ctx.globalAlpha = Math.min(1, 0.5 + o.charge) * facing;
      ctx.beginPath();
      ctx.arc(dx, dy, R * (0.05 + 0.1 * o.charge), 0, TAU);
      ctx.fill();
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.arc(dx, dy, R * 0.03 * (1 + o.charge), 0, TAU);
      ctx.fill();
    }
  }

  // outline
  ctx.globalAlpha = o.alpha;
  ctx.lineWidth = lw * 1.5;
  ctx.beginPath();
  ringPath(ctx, cx, cy, R);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** The superlaser shot: an energy ring grows out of the dish and floods the screen. `p` runs 0 -> 1. */
export function drawBeam(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  diagonal: number,
  p: number,
  lw: number,
): void {
  if (p <= 0) return;
  const e = p * p;
  ctx.lineCap = 'round';
  const radius = diagonal * 0.012 + diagonal * 0.8 * e * p;
  ctx.fillStyle = GREEN;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = WHITE;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.22, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = lw * 2;
  ctx.globalAlpha = 0.95;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(x, y, radius * (0.4 + i * 0.16), 0, TAU);
    ctx.stroke();
  }
  // rays
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = lw * 1.4;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU + hash1(i) * 0.2;
    const r0 = radius * (0.5 + 0.3 * hash1(i * 3.3));
    const r1 = radius * (1.1 + 0.9 * hash1(i * 5.7));
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
  }
  ctx.stroke();
  // whiteout at the end
  const white = ramp(p, 0.72, 1);
  if (white > 0) {
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = white;
    ctx.fillRect(x - diagonal, y - diagonal, diagonal * 2, diagonal * 2);
  }
  ctx.globalAlpha = 1;
}

/** Fireball, shock ring and debris, starting from a white screen. `p` runs 0 -> 1. */
export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  p: number,
  lw: number,
): void {
  const diagonal = Math.hypot(width, height);
  ctx.lineCap = 'round';
  const e = easeOutCubic(clamp01(p));
  const fade = 1 - p;

  // the screen is white at first, then the fire burns down through yellow and orange
  const flash = 1 - smoothstep(0, 0.16, p);
  if (flash > 0) {
    ctx.fillStyle = WHITE;
    ctx.globalAlpha = flash;
    ctx.fillRect(0, 0, width, height);
  }
  const burn = diagonal * (0.12 + 0.7 * e);
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, burn);
  gradient.addColorStop(0, WHITE);
  gradient.addColorStop(0.3, YELLOW);
  gradient.addColorStop(0.65, FIRE);
  gradient.addColorStop(1, 'rgba(255,150,50,0)');
  ctx.fillStyle = gradient;
  ctx.globalAlpha = Math.min(1, 1.6 * fade);
  ctx.fillRect(0, 0, width, height);

  // fireball: a cloud of puffs thrown outwards, each puff rolling a bit slower than the one before
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 30; i++) {
    const a = hash1(i * 2.7) * TAU;
    const d =
      diagonal * 0.4 * hash1(i * 5.1) * easeOutCubic(clamp01(p * (0.6 + 0.8 * hash1(i * 7.3))));
    const r = diagonal * (0.06 + 0.15 * hash1(i * 3.9)) * (0.4 + e);
    ctx.fillStyle = i % 3 === 0 ? YELLOW : FIRE;
    ctx.globalAlpha = 0.45 * fade * fade;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = WHITE;
  ctx.globalAlpha = 0.95 * fade;
  ctx.beginPath();
  ctx.arc(cx, cy, diagonal * 0.1 * (0.4 + e), 0, TAU);
  ctx.fill();

  // shock rings
  for (let i = 0; i < 3; i++) {
    const q = clamp01(p * 1.15 - i * 0.08);
    const radius = diagonal * 0.8 * easeOutCubic(q);
    ctx.strokeStyle = i === 0 ? WHITE : YELLOW;
    ctx.globalAlpha = 0.95 * (1 - q);
    ctx.lineWidth = lw * (1 + 4 * (1 - q));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.stroke();
  }
  // debris streaks
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = lw * 1.2;
  ctx.globalAlpha = 0.95 * fade;
  ctx.beginPath();
  for (let i = 0; i < 80; i++) {
    const a = hash1(i * 1.7) * TAU;
    const speed = 0.35 + 0.9 * hash1(i * 4.3);
    const r1 = diagonal * 0.5 * easeOutCubic(clamp01(p * speed * 1.6));
    const len = diagonal * 0.05 * (0.4 + hash1(i * 8.1)) * (1 - p * 0.6);
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * (r1 + len), cy + Math.sin(a) * (r1 + len));
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}
