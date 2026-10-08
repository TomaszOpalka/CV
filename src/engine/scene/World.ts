import { ballArenaPosition, BALL_RADIUS, SMOKE_CENTER } from './ballFlight';
import { Camera3D } from './Camera3D';
import { carTravel, DRIVE_START } from './driving';
import { easeInOut, easeOutCubic, KeyTrack, lerp, ramp, smoothstep } from './math';
import { drawBall } from './models/ball';
import { Car } from './models/car';
import { drawCourt, drawHoop } from './models/court';
import {
  dishScreenPosition,
  drawBeam,
  drawDeathStar,
  drawDrift,
  drawExplosion,
  drawReactor,
  drawStreaks,
  type Hero,
} from './models/hero';
import { Smoke } from './models/smoke';
import { Pen } from './Pen';
import { ACT_LENGTHS, ACT_START } from './timeline';

/** Camera channels: yaw, pitch, roll, tx, ty, tz, fw, fh, dist, follow. */
const CHANNELS = 10;
const WHEEL_RADIUS = 0.35;

/**
 * The 3D world of the intro: every model, the camera path and what is visible when.
 * `render(t)` draws the world at second `t` of the sequence into the raster context.
 */
export class World {
  readonly cam = new Camera3D();
  private readonly pen: Pen;
  private readonly car = new Car();
  private readonly smoke = new Smoke();
  private trackA!: KeyTrack;
  private trackB!: KeyTrack;
  private readonly keys = new Float64Array(CHANNELS);
  private readonly ball = new Float64Array(3);
  private readonly dish = new Float64Array(3);
  private readonly mark = new Float64Array(16 * 3);
  private readonly tmp = new Float64Array(3);
  private width = 0;
  private height = 0;
  /** Radius (px) of the hero object (ball -> reactor -> Death Star) at rest. */
  private heroRadius = 0;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    private readonly cellW: number,
    private readonly cellH: number = cellW / 0.6,
  ) {
    this.pen = new Pen(ctx, this.cam);
    this.resize(width, height);
  }

  /** Canvas size in CSS px (the raster covers whole cells, so it may be slightly larger than the screen). */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.heroRadius = Math.min(0.26 * height, 0.34 * width);
    this.buildTracks();
  }

  private buildTracks(): void {
    const S = ACT_START;
    const L = ACT_LENGTHS;
    const zoomHero = this.heroRadius / BALL_RADIUS;
    const heroFw = this.width / zoomHero;
    const heroFh = this.height / zoomHero;
    const sc = SMOKE_CENTER;

    this.trackA = new KeyTrack([
      [0, 8, 30, 0, -1.2, 0, 0.42, 1.3, 1.02, 14, 0],
      [S.engine + L.engine, 24, 26, 0, -1.2, 0, 0.42, 1.3, 1.02, 14, 0],
      [S.turn + 0.8, 10, 60, 40, -0.4, 0, 0.35, 4.2, 4.2, 16, 0],
      [S.orbit, 0, 90, 90, 0, 0, 0.3, 3.4, 7.0, 16, 0],
      [S.orbit + 0.15, 0, 90, 90, 0, 0, 0.3, 3.4, 7.0, 16, 0],
      [S.orbit + 0.8, 10, 40, 40, -0.5, 0, 0.45, 4, 3.2, 12, 0],
      [S.pullback, 22, 14, 0, -1.2, 0, 0.55, 2.4, 1.5, 9, 0],
      [S.drive, 14, 8, 0, 0, 0, 0.5, 7.4, 3.2, 24, 0],
      [S.smoke, 14, 8, 0, 0, 0, 0.5, 7.4, 3.2, 24, 0],
      [S.fall, 0, 6, 0, sc.x, sc.y, sc.z, 0.9, 0.7, 6, 0],
    ]);
    this.trackB = new KeyTrack([
      [S.fall, 0, 6, 0, 0, 0, 0, 0.9, 0.7, 6, 1],
      [S.hoop, 0, 24, 0, 0, 0, 0, 3.0, 2.2, 10, 1],
      [S.hoop + 0.7, 0, 26, 0, 0, -0.6, 2.0, 4.8, 4.3, 12, 0],
      [S.hoop + 2.6, 0, 28, 0, 0, -0.9, 1.7, 4.6, 4.0, 11, 0],
      [S.reactor, 0, 30, 0, 0, -0.9, 1.4, 4.4, 3.8, 11, 0.4],
      [S.reactor + 1.5, 0, 6, 0, 0, 0, 0, heroFw, heroFh, 8, 1],
      [S.reactor + L.reactor, 0, 6, 0, 0, 0, 0, heroFw, heroFh, 8, 1],
    ]);
  }

  render(t: number): void {
    const { cam, keys, ctx, ball } = this;
    const S = ACT_START;
    const L = ACT_LENGTHS;
    const arena = t >= S.fall;

    ballArenaPosition(t, ball);
    if (arena) {
      this.trackB.sample(t, keys);
      const follow = keys[9]!;
      cam.tx = lerp(keys[3]!, ball[0]!, follow);
      cam.ty = lerp(keys[4]!, ball[1]!, follow);
      cam.tz = lerp(keys[5]!, ball[2]!, follow);
    } else {
      this.trackA.sample(t, keys);
      cam.tx = keys[3]!;
      cam.ty = keys[4]!;
      cam.tz = keys[5]!;
    }
    cam.yaw = keys[0]!;
    cam.pitch = keys[1]!;
    cam.roll = keys[2]!;
    cam.dist = keys[8]!;
    cam.zoom = Math.min(this.width / keys[6]!, this.height / keys[7]!);
    cam.cx = this.width / 2;
    cam.cy = this.height / 2;
    cam.update();

    const lw = this.cellH * 0.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (t < S.fall) this.drawCarWorld(t, lw);
    else this.drawArena(t, lw);

    // --- screen-space finale ---
    const cx = this.width / 2;
    const cy = this.height / 2;
    if (t >= S.reactor && t < S.explosion) this.drawHero(t, cx, cy, lw);
    if (t >= S.explosion && t < S.matrix) {
      drawExplosion(
        ctx,
        cx,
        cy,
        this.width,
        this.height,
        Math.min(1, (t - S.explosion) / (L.explosion * 0.7)),
        lw,
      );
    }
    ctx.globalAlpha = 1;
  }

  // --- acts 1 - 7: engine, car, smoke, ball ------------------------------------------------

  private drawCarWorld(t: number, lw: number): void {
    const { ctx, pen } = this;
    const S = ACT_START;

    const ground = smoothstep(S.turn + 0.6, S.orbit, t) * (1 - ramp(t, S.smoke + 0.7, S.fall));
    if (ground > 0.01) this.drawGround(ground * 0.3, lw * 0.5);

    const x = carTravel(t);
    if (x < 14) {
      const coverT = ramp(t, S.orbit + 0.9, S.pullback - 0.05);
      this.car.draw(pen, {
        x,
        spin: x / WHEEL_RADIUS,
        alpha: smoothstep(S.turn + 0.1, S.turn + 1.0, t),
        engine: ramp(t, 0, 0.3) * (1 - smoothstep(S.pullback - 0.2, S.pullback + 0.2, t)),
        engineTime: t,
        cover: smoothstep(0, 0.35, coverT),
        coverLift: 1.4 * (1 - easeOutCubic(coverT)),
        lw,
      });
    }

    if (t >= DRIVE_START) {
      this.smoke.draw(pen, {
        now: t,
        start: DRIVE_START,
        carX: carTravel,
        curl: ramp(t, S.smoke + 0.1, S.smoke + 1.0),
        alpha: 1,
      });
    }

    // the ball forms inside the swirl
    const form = smoothstep(S.smoke + 0.6, S.smoke + 1.2, t);
    if (form > 0.01) {
      drawBall(pen, {
        x: SMOKE_CENTER.x,
        y: SMOKE_CENTER.y,
        z: SMOKE_CENTER.z,
        spin: 2.5 * t,
        alpha: form,
        seams: form,
        lw,
      });
    }
    ctx.globalAlpha = 1;
  }

  private drawGround(alpha: number, lw: number): void {
    const { ctx, pen } = this;
    ctx.strokeStyle = '#fff';
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let x = -12; x <= 12; x += 2) pen.line(x, -2.5, 0, x, 2.5, 0);
    for (let y = -2; y <= 2; y += 2) pen.line(-12, y, 0, 12, y, 0);
    ctx.stroke();
    ctx.globalAlpha = alpha * 1.8;
    ctx.beginPath();
    pen.line(-12, -2.5, 0, 12, -2.5, 0);
    pen.line(-12, 2.5, 0, 12, 2.5, 0);
    ctx.stroke();
  }

  // --- acts 7 - 9: the fall, the hoop and the bounces --------------------------------------

  private drawArena(t: number, lw: number): void {
    const { ctx, pen, ball } = this;
    const S = ACT_START;
    const height = ball[2]!;
    const finale = 1 - ramp(t, S.reactor + 0.1, S.reactor + 1.1);

    const streaks = ramp(t, S.fall, S.fall + 0.5) * (1 - ramp(t, S.hoop - 0.2, S.hoop + 0.6));
    drawStreaks(ctx, this.width, this.height, t, streaks, lw);

    const court = smoothstep(14, 5, height) * finale;
    drawCourt(pen, { alpha: court, lw });
    drawHoop(pen, { alpha: court, lw });

    // the ball's mark on the floor: it shrinks and brightens as the ball comes down
    if (court > 0.05 && height < 8) {
      const near = 1 / (1 + height * 1.2);
      const r = 0.2 + 0.1 * (1 - near);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        this.mark[i * 3] = ball[0]! + Math.cos(a) * r;
        this.mark[i * 3 + 1] = ball[1]! + Math.sin(a) * r;
        this.mark[i * 3 + 2] = 0;
      }
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.5 * near * court;
      pen.face(this.mark, 16, false);
    }

    // the ball: seams fade and the disc dims while the reactor takes over
    const build = ramp(t, S.reactor + 0.9, S.reactor + 2.3);
    this.ballRadiusPx = this.cam.project(ball[0]!, ball[1]!, ball[2]!, this.tmp)
      ? this.tmp[2]! * BALL_RADIUS
      : -1;
    const alpha = 1 - smoothstep(0.15, 1, build);
    if (alpha > 0.004) {
      drawBall(pen, {
        x: ball[0]!,
        y: ball[1]!,
        z: ball[2]!,
        spin: 2.5 * t,
        alpha,
        seams: 1 - smoothstep(0, 0.35, build),
        lw,
      });
    }
  }

  /** Screen radius of the ball in the last frame (the reactor grows out of it). */
  private ballRadiusPx = -1;

  // --- acts 9 - 11: reactor, Death Star, shot -----------------------------------------------

  private drawHero(t: number, cx: number, cy: number, lw: number): void {
    const { ctx } = this;
    const S = ACT_START;
    const L = ACT_LENGTHS;

    // reactor
    if (t < S.deathStar + 1.2) {
      const local = t - S.reactor;
      const R =
        t < S.deathStar && this.ballRadiusPx > 0
          ? Math.min(this.ballRadiusPx, this.heroRadius)
          : this.heroRadius;
      const build = ramp(t, S.reactor + 0.9, S.reactor + 2.3);
      const shrink = 1 - smoothstep(S.deathStar, S.deathStar + 1.1, t);
      const hero: Hero = { cx, cy, radius: R, lw };
      drawDrift(
        ctx,
        this.width,
        this.height,
        local,
        0.18 * smoothstep(S.reactor + 0.6, S.reactor + 1.8, t) * shrink,
        lw,
      );
      drawReactor(ctx, hero, {
        time: local,
        build: build * shrink,
        mechanism: smoothstep(0.55, 1, build) * shrink,
      });
    }

    // Death Star
    if (t >= S.deathStar) {
      const tau = t - S.deathStar;
      const grow = 1 + 0.35 * easeInOut(ramp(tau, 0.3, 2.0));
      const recede = 1 - 0.55 * easeInOut(ramp(tau, 3.0, 3.9));
      const radius = this.heroRadius * grow * recede;
      const hero: Hero = { cx, cy, radius, lw };
      const longitude = lerp(-2.2, 0.15, easeInOut(ramp(tau, 1.3, 3.3)));
      drawDeathStar(ctx, hero, {
        dishLongitude: longitude,
        alpha: smoothstep(0.1, 1.0, tau),
        charge: ramp(tau, 3.3, 4.3),
        time: tau,
      });
      const p = ramp(tau, 4.3, L.deathStar);
      if (p > 0) {
        dishScreenPosition(hero, longitude, this.dish);
        drawBeam(ctx, this.dish[0]!, this.dish[1]!, Math.hypot(this.width, this.height), p, lw);
      }
    }
  }
}
