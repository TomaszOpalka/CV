import { dragFactor, falloff } from '../glyph/forces';
import { heatBucket } from './heatPalette';
import { Shockwave } from './Shockwave';

export type PixelPhase = 'idle' | 'exploding' | 'cleared';

/** What the field needs to know about the pointer each frame. */
export interface HeatInput {
  x: number;
  y: number;
  /** Mouse inside the field, or a finger / button down. */
  active: boolean;
  /** Seconds the pointer has been held down (eased back to 0 after release by the caller). */
  hold: number;
}

/** Holding for this long fills the field with heat and sets off the explosion. */
export const CHARGE_SECONDS = 1.8;

const HOVER_RADIUS = 70;
const MAX_RADIUS_FACTOR = 0.55; // of the field's diagonal
const COOL_PER_SECOND = 0.7;
const SHOCK_SPEED = 1500;
const KICK_MIN = 260;
const KICK_RANGE = 520;
const GRAVITY = 900;
const DEBRIS_DRAG = 1.1;
const LIFE_DECAY = 0.8;
/** Chance per frame that a lit digit changes. */
const FLICKER = 0.12;

/**
 * Structure-of-arrays field of digits (one per grid cell, the cells are taller than wide like the intro's) that heats up around the pointer:
 * hovering lights a small spot, holding makes it grow, and the heat then cools off cell by cell with ragged
 * edges. `explode` sends a shockwave from a point; every pixel the front reaches is thrown out as debris that
 * cools while it falls, until the field is `cleared`. No DOM access and no per-frame allocation.
 * Units: CSS px and seconds; positions are pixel centres.
 */
export class PixelField {
  readonly cols: number;
  readonly rows: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly count: number;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly homeX: Float32Array;
  readonly homeY: Float32Array;
  readonly heat: Float32Array;
  /** Fixed per-cell offset that makes the edges of the heat ragged. */
  readonly noise: Float32Array;
  /** The digit (0-9) shown in each cell; lit cells keep changing it. */
  readonly glyph: Uint8Array;
  /** 1 while attached to the grid, 0 once thrown. */
  readonly attached: Uint8Array;
  readonly life: Float32Array;
  /** Colour index to draw (-1: cold). Updated by `step`. */
  readonly bucket: Int8Array;
  /** Colour index a cell had when it was thrown. */
  private readonly thrownColor: Int8Array;

  phase: PixelPhase = 'idle';
  /** Seconds since the explosion started (0 while idle). */
  explosionTime = 0;

  private readonly rng: () => number;
  private readonly diagonal: number;
  private shock: Shockwave | null = null;
  private flying = 0;

  constructor(
    cols: number,
    rows: number,
    cellW: number,
    cellH: number,
    rng: () => number = Math.random,
  ) {
    this.cols = cols;
    this.rows = rows;
    this.cellW = cellW;
    this.cellH = cellH;
    this.count = cols * rows;
    this.rng = rng;
    this.diagonal = Math.hypot(cols * cellW, rows * cellH);

    const n = this.count;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.homeX = new Float32Array(n);
    this.homeY = new Float32Array(n);
    this.heat = new Float32Array(n);
    this.noise = new Float32Array(n);
    this.glyph = new Uint8Array(n);
    this.attached = new Uint8Array(n);
    this.life = new Float32Array(n);
    this.bucket = new Int8Array(n);
    this.thrownColor = new Int8Array(n);
    this.reset();
  }

  /** Put every pixel back on its cell, cold, and start over. */
  reset(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const i = row * this.cols + col;
        this.homeX[i] = this.x[i] = (col + 0.5) * this.cellW;
        this.homeY[i] = this.y[i] = (row + 0.5) * this.cellH;
        this.vx[i] = 0;
        this.vy[i] = 0;
        this.heat[i] = 0;
        this.noise[i] = (this.rng() - 0.5) * 0.3;
        this.glyph[i] = Math.floor(this.rng() * 10);
        this.attached[i] = 1;
        this.life[i] = 1;
        this.bucket[i] = -1;
      }
    }
    this.phase = 'idle';
    this.explosionTime = 0;
    this.shock = null;
    this.flying = 0;
  }

  /** 0..1: how far the current hold has charged the field. */
  static charge(hold: number): number {
    return Math.min(1, Math.max(0, hold / CHARGE_SECONDS));
  }

  step(dt: number, input: HeatInput): void {
    if (this.phase === 'idle') this.stepIdle(dt, input);
    else if (this.phase === 'exploding') this.stepExploding(dt);
  }

  /** Start the shockwave from (ox, oy). Ignored unless the field is idle. */
  explode(ox: number, oy: number): void {
    if (this.phase !== 'idle') return;
    this.phase = 'exploding';
    this.explosionTime = 0;
    this.shock = new Shockwave(ox, oy, SHOCK_SPEED);
  }

  /** How strongly the page should shake right now (0..1): sharp at the start, gone after ~0.7 s. */
  shake(): number {
    if (this.phase !== 'exploding') return 0;
    const t = this.explosionTime;
    return t > 0.7 ? 0 : (1 - t / 0.7) ** 2;
  }

  private stepIdle(dt: number, input: HeatInput): void {
    const charge = PixelField.charge(input.hold);
    const eased = charge * charge * (3 - 2 * charge);
    const radius = HOVER_RADIUS + (this.diagonal * MAX_RADIUS_FACTOR - HOVER_RADIUS) * eased;
    const strength = 0.62 + 0.55 * eased;
    const cool = COOL_PER_SECOND * dt;
    const active = input.active;

    for (let i = 0; i < this.count; i++) {
      let level = this.heat[i]! - cool * (0.6 + (0.8 * (this.noise[i]! + 0.15)) / 0.3);
      if (active) {
        const dx = this.homeX[i]! - input.x;
        const dy = this.homeY[i]! - input.y;
        if (dx < radius && dx > -radius && dy < radius && dy > -radius) {
          const d = Math.sqrt(dx * dx + dy * dy);
          const f = falloff(d, radius);
          if (f > 0) {
            // A hotter core inside the spot, so it shows the whole range from blue to red.
            const target = strength * (0.35 + 0.8 * f) * f ** 0.35;
            if (target > level) level = target;
          }
        }
      }
      if (level < 0) level = 0;
      this.heat[i] = level;
      if (level > 0 && this.rng() < FLICKER) this.glyph[i] = Math.floor(this.rng() * 10);
      this.bucket[i] = level > 0 ? heatBucket(level + this.noise[i]!) : -1;
    }
  }

  private stepExploding(dt: number): void {
    this.explosionTime += dt;
    const shock = this.shock;
    if (shock) {
      shock.advance(dt);
      for (let i = 0; i < this.count; i++) {
        if (this.attached[i] === 0) continue;
        const dx = this.homeX[i]! - shock.ox;
        const dy = this.homeY[i]! - shock.oy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (!shock.passed(d)) continue;
        this.attached[i] = 0;
        this.flying++;
        // Debris keeps the colour it had, with a minimum so even cold cells flash up when hit.
        this.thrownColor[i] = Math.max(this.bucket[i]!, 1 + Math.floor(this.rng() * 4));
        const nx = d > 1e-3 ? dx / d : Math.cos(this.rng() * Math.PI * 2);
        const ny = d > 1e-3 ? dy / d : Math.sin(this.rng() * Math.PI * 2);
        const falloffByDistance = 1 - 0.55 * Math.min(1, d / this.diagonal);
        const speed = (KICK_MIN + KICK_RANGE * this.rng()) * falloffByDistance;
        const side = (this.rng() - 0.5) * 0.5;
        this.vx[i] = (nx - ny * side) * speed;
        this.vy[i] = (ny + nx * side) * speed - 120 * this.rng();
      }
      if (shock.done(this.diagonal)) this.shock = null;
    }

    const drag = dragFactor(DEBRIS_DRAG, dt);
    for (let i = 0; i < this.count; i++) {
      if (this.attached[i] === 1) {
        // Cells the front has not reached yet cool down as usual.
        const level = Math.max(0, this.heat[i]! - COOL_PER_SECOND * dt);
        this.heat[i] = level;
        this.bucket[i] = level > 0 ? heatBucket(level + this.noise[i]!) : -1;
        continue;
      }
      const life = this.life[i]!;
      if (life <= 0) continue;
      const vy = (this.vy[i]! + GRAVITY * dt) * drag;
      this.vx[i] = this.vx[i]! * drag;
      this.vy[i] = vy;
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + vy * dt;
      const next = life - LIFE_DECAY * dt;
      this.life[i] = next;
      if (next <= 0) {
        this.flying--;
        this.bucket[i] = -1;
      } else {
        // Debris cools while it flies: red -> lime -> amber -> blue -> navy -> gone.
        this.bucket[i] = Math.min(this.thrownColor[i]!, Math.floor(next * 5));
      }
    }

    if (this.shock === null && this.flying <= 0) this.phase = 'cleared';
  }
}
