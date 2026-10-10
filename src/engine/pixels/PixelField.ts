import { dragFactor, falloff } from '../glyph/forces';
import type { PointerState } from '../glyph/GlyphField';
import { Shockwave } from './Shockwave';

export type PixelPhase = 'idle' | 'exploding' | 'cleared';

const SETTLE_RATE = 8;
const WAVE_SPEED = 1.8;
const WAVE_LENGTH = 0.32;
const SHOCK_SPEED = 1400;
const KICK_MIN = 280;
const KICK_RANGE = 520;
const GRAVITY = 900;
const DEBRIS_DRAG = 1.1;
const LIFE_DECAY = 0.75;
const FLICKER_PER_SECOND = 0.35;

/**
 * Structure-of-arrays field of square pixels (one per grid cell). Idle: a slow wave, random flicker
 * and a glow around the pointer. `explode` sends a shockwave from a point; every pixel the front
 * reaches is thrown out as debris, falls and fades, until the field is `cleared`.
 * No DOM access and no per-frame allocation. Units: CSS px and seconds; positions are pixel centres.
 */
export class PixelField {
  readonly cols: number;
  readonly rows: number;
  readonly cell: number;
  readonly count: number;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly homeX: Float32Array;
  readonly homeY: Float32Array;
  /** Brightness 0..1 (already includes life while flying). */
  readonly level: Float32Array;
  readonly base: Float32Array;
  /** 1 while attached to the grid, 0 once thrown. */
  readonly attached: Uint8Array;
  readonly life: Float32Array;

  phase: PixelPhase = 'idle';
  /** Seconds since the explosion started (0 while idle). */
  explosionTime = 0;

  private readonly rng: () => number;
  private readonly diagonal: number;
  private clock = 0;
  private flickerCarry = 0;
  private shock: Shockwave | null = null;
  private flying = 0;

  constructor(cols: number, rows: number, cell: number, rng: () => number = Math.random) {
    this.cols = cols;
    this.rows = rows;
    this.cell = cell;
    this.count = cols * rows;
    this.rng = rng;
    this.diagonal = Math.hypot(cols * cell, rows * cell);

    const n = this.count;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.homeX = new Float32Array(n);
    this.homeY = new Float32Array(n);
    this.level = new Float32Array(n);
    this.base = new Float32Array(n);
    this.attached = new Uint8Array(n);
    this.life = new Float32Array(n);
    this.reset();
  }

  /** Put every pixel back on its cell and start over. */
  reset(): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const i = row * this.cols + col;
        this.homeX[i] = this.x[i] = (col + 0.5) * this.cell;
        this.homeY[i] = this.y[i] = (row + 0.5) * this.cell;
        this.vx[i] = 0;
        this.vy[i] = 0;
        this.base[i] = 0.1 + this.rng() * 0.14;
        this.level[i] = this.base[i]!;
        this.attached[i] = 1;
        this.life[i] = 1;
      }
    }
    this.phase = 'idle';
    this.explosionTime = 0;
    this.shock = null;
    this.flying = 0;
  }

  step(dt: number, pointer: PointerState): void {
    this.clock += dt;
    if (this.phase === 'idle') this.stepIdle(dt, pointer);
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

  private stepIdle(dt: number, pointer: PointerState): void {
    const settle = Math.min(1, SETTLE_RATE * dt);
    const radius = pointer.radius * 1.4;
    const active = pointer.active;
    const phase = this.clock * WAVE_SPEED;

    for (let i = 0; i < this.count; i++) {
      const col = i % this.cols;
      const row = (i - col) / this.cols;
      const wave = Math.max(0, Math.sin((col + row) * WAVE_LENGTH - phase)) ** 8 * 0.35;
      let target = this.base[i]! + wave;
      if (active) {
        const dx = this.homeX[i]! - pointer.x;
        const dy = this.homeY[i]! - pointer.y;
        if (dx < radius && dx > -radius && dy < radius && dy > -radius) {
          target += 0.75 * falloff(Math.sqrt(dx * dx + dy * dy), radius);
        }
      }
      const current = this.level[i]!;
      // Brightening is quick, fading is slow, so the pointer leaves a short trail.
      this.level[i] =
        current + (target - current) * (target > current ? Math.min(1, settle * 3) : settle * 0.5);
    }

    this.flickerCarry += this.count * FLICKER_PER_SECOND * dt;
    const n = Math.floor(this.flickerCarry);
    this.flickerCarry -= n;
    for (let k = 0; k < n; k++) {
      const i = Math.floor(this.rng() * this.count);
      this.level[i] = Math.min(1, this.level[i]! + 0.4);
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
        const nx = d > 1e-3 ? dx / d : Math.cos(this.rng() * Math.PI * 2);
        const ny = d > 1e-3 ? dy / d : Math.sin(this.rng() * Math.PI * 2);
        const falloffByDistance = 1 - 0.55 * Math.min(1, d / this.diagonal);
        const speed = (KICK_MIN + KICK_RANGE * this.rng()) * falloffByDistance;
        const side = (this.rng() - 0.5) * 0.5;
        this.vx[i] = (nx - ny * side) * speed;
        this.vy[i] = (ny + nx * side) * speed - 120 * this.rng();
        this.level[i] = 1;
      }
      if (shock.done(this.diagonal)) this.shock = null;
    }

    const drag = dragFactor(DEBRIS_DRAG, dt);
    for (let i = 0; i < this.count; i++) {
      if (this.attached[i] === 1) continue;
      const life = this.life[i]!;
      if (life <= 0) continue;
      const vy = (this.vy[i]! + GRAVITY * dt) * drag;
      this.vx[i] = this.vx[i]! * drag;
      this.vy[i] = vy;
      this.x[i] = this.x[i]! + this.vx[i]! * dt;
      this.y[i] = this.y[i]! + vy * dt;
      const next = life - LIFE_DECAY * dt;
      this.life[i] = next;
      if (next <= 0) this.flying--;
      this.level[i] = Math.max(0, next);
    }

    if (this.shock === null && this.flying <= 0) this.phase = 'cleared';
  }
}
