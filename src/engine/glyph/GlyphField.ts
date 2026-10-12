import { dragFactor, explosionSpeed, falloff } from './forces';
import type { Grid } from './portrait';

export type FieldPhase = 'idle' | 'explode' | 'blast' | 'scene' | 'hold';

export interface PointerState {
  x: number;
  y: number;
  active: boolean;
  /** Repel radius in CSS px. */
  radius: number;
}

const HOME_STIFFNESS = 38;
const HOME_DAMPING = 9;
const REPEL_ACCEL = 2600;
const EXPLODE_DRAG = 1.9;
const EXPLODE_STRENGTH = 1500;
/** While a scene plays, the digits fly back to their grid cells with this spring (slightly under-damped). */
const SCENE_STIFFNESS = 46;
const SCENE_DAMPING_RATIO = 0.8;
const FLICKER_PER_SECOND = 0.7;

/**
 * Structure-of-arrays particle system for the digit grid. One particle per grid cell.
 * While a scene plays (`beginScene`) every cell owns its position and an outside producer
 * (the intro sequence) writes the digit and tone of every cell each frame.
 * No DOM access and no per-frame allocations, so it is cheap to run and easy to test.
 * Units: CSS px and seconds. Positions refer to the glyph centre.
 */
export class GlyphField {
  readonly count: number;
  readonly cols: number;
  readonly rows: number;
  readonly cellW: number;
  readonly cellH: number;
  readonly toneLevels: number;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly homeX: Float32Array;
  readonly homeY: Float32Array;
  readonly tone: Float32Array;
  readonly baseTone: Float32Array;
  readonly glyph: Uint8Array;
  /** Colour palette of every glyph (index into `PALETTES`); 0 = white. */
  readonly palette: Uint8Array;
  readonly rowOf: Uint16Array;

  phase: FieldPhase = 'idle';
  phaseTime = 0;

  private readonly rng: () => number;
  private flickerCarry = 0;
  private readonly diagonal: number;

  constructor(grid: Grid, toneLevels: number, rng: () => number = Math.random) {
    this.cols = grid.cols;
    this.rows = grid.rows;
    this.cellW = grid.cellW;
    this.cellH = grid.cellH;
    this.count = grid.cols * grid.rows;
    this.toneLevels = toneLevels;
    this.rng = rng;
    this.diagonal = Math.hypot(grid.cols * grid.cellW, grid.rows * grid.cellH);

    const n = this.count;
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.homeX = new Float32Array(n);
    this.homeY = new Float32Array(n);
    this.tone = new Float32Array(n);
    this.baseTone = new Float32Array(n);
    this.glyph = new Uint8Array(n);
    this.palette = new Uint8Array(n);
    this.rowOf = new Uint16Array(n);

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const i = row * grid.cols + col;
        const hx = (col + 0.5) * grid.cellW;
        const hy = (row + 0.5) * grid.cellH;
        this.homeX[i] = this.x[i] = hx;
        this.homeY[i] = this.y[i] = hy;
        this.rowOf[i] = row;
        this.glyph[i] = Math.floor(rng() * 10);
        this.baseTone[i] = this.tone[i] = 1 + rng() * 2;
      }
    }
  }

  /** Advance the simulation by `dt` seconds (callers clamp dt, e.g. to 50 ms). */
  step(dt: number, pointer: PointerState): void {
    this.phaseTime += dt;
    switch (this.phase) {
      case 'idle':
        this.stepIdle(dt, pointer);
        break;
      case 'explode':
        this.stepExplode(dt);
        break;
      case 'blast':
        this.stepBlast(dt);
        break;
      case 'scene':
        this.stepScene(dt);
        break;
      case 'hold':
        break;
    }
  }

  /** Blast every particle away from (ox, oy). */
  explode(ox: number, oy: number): void {
    const top = this.toneLevels - 1;
    const spread = this.diagonal * 0.35;
    for (let i = 0; i < this.count; i++) {
      let dx = this.x[i]! - ox;
      let dy = this.y[i]! - oy;
      let d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.5) {
        const angle = this.rng() * Math.PI * 2;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        d = 1;
      }
      const speed = explosionSpeed(d, EXPLODE_STRENGTH, spread) * (0.7 + 0.6 * this.rng()) + 90;
      this.vx[i] = this.vx[i]! + (dx / d) * speed;
      this.vy[i] = this.vy[i]! + (dy / d) * speed;
      const flash = Math.min(1, speed / 700);
      const base = this.baseTone[i]!;
      this.tone[i] = Math.max(this.tone[i]!, base + (top - base) * flash);
    }
    this.phase = 'explode';
    this.phaseTime = 0;
  }

  /**
   * Throws every digit away from (ox, oy) like debris, without touching glyphs or tones (the scene
   * keeps painting them). Digits far from the centre fly faster, so the picture bursts apart.
   */
  blast(ox: number, oy: number): void {
    for (let i = 0; i < this.count; i++) {
      const dx = this.x[i]! - ox;
      const dy = this.y[i]! - oy;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const speed = 1.1 * d + 160 + 380 * this.rng();
      const spin = (this.rng() - 0.5) * 0.7;
      this.vx[i] = (dx / d) * speed - (dy / d) * speed * spin;
      this.vy[i] = (dy / d) * speed + (dx / d) * speed * spin;
    }
    this.phase = 'blast';
    this.phaseTime = 0;
  }

  /** Hand the digits over to a scene: they spring back to their cells while the producer sets glyph and tone. */
  beginScene(): void {
    this.phase = 'scene';
    this.phaseTime = 0;
  }

  /** Freeze motion (used while the photo takes over). */
  hold(): void {
    this.phase = 'hold';
    this.phaseTime = 0;
  }

  fade(dt: number, rate: number): void {
    const k = dragFactor(rate, dt);
    for (let i = 0; i < this.count; i++) this.tone[i] = this.tone[i]! * k;
  }

  private flicker(dt: number, multiplier: number): void {
    this.flickerCarry += this.count * FLICKER_PER_SECOND * multiplier * dt;
    const n = Math.floor(this.flickerCarry);
    this.flickerCarry -= n;
    const top = this.toneLevels - 1;
    for (let k = 0; k < n; k++) {
      const i = Math.floor(this.rng() * this.count);
      this.glyph[i] = Math.floor(this.rng() * 10);
      this.tone[i] = Math.min(top, Math.max(this.tone[i]!, this.baseTone[i]! + 2));
    }
  }

  private stepIdle(dt: number, pointer: PointerState): void {
    const damp = dragFactor(HOME_DAMPING, dt);
    const relax = Math.min(1, 7 * dt);
    const radius = pointer.radius;
    const active = pointer.active;
    const top = this.toneLevels - 1;

    for (let i = 0; i < this.count; i++) {
      const xi = this.x[i]!;
      const yi = this.y[i]!;
      let ax = 0;
      let ay = 0;

      if (active) {
        const dx = xi - pointer.x;
        const dy = yi - pointer.y;
        if (dx < radius && dx > -radius && dy < radius && dy > -radius) {
          const d = Math.sqrt(dx * dx + dy * dy);
          const f = falloff(d, radius);
          if (f > 0) {
            if (d > 1e-4) {
              const s = (REPEL_ACCEL * f) / d;
              ax = dx * s;
              ay = dy * s;
            }
            const boosted = Math.min(top, this.baseTone[i]! + 4 * f);
            if (this.tone[i]! < boosted) this.tone[i] = boosted;
          }
        }
      }

      const vxi = (this.vx[i]! + (ax + (this.homeX[i]! - xi) * HOME_STIFFNESS) * dt) * damp;
      const vyi = (this.vy[i]! + (ay + (this.homeY[i]! - yi) * HOME_STIFFNESS) * dt) * damp;
      this.vx[i] = vxi;
      this.vy[i] = vyi;
      this.x[i] = xi + vxi * dt;
      this.y[i] = yi + vyi * dt;
      this.tone[i] = this.tone[i]! + (this.baseTone[i]! - this.tone[i]!) * relax;
    }
    this.flicker(dt, 1);
  }

  private stepExplode(dt: number): void {
    const drag = dragFactor(EXPLODE_DRAG, dt);
    const relax = Math.min(1, 2.5 * dt);
    for (let i = 0; i < this.count; i++) {
      const vxi = this.vx[i]! * drag;
      const vyi = this.vy[i]! * drag;
      this.vx[i] = vxi;
      this.vy[i] = vyi;
      this.x[i] = this.x[i]! + vxi * dt;
      this.y[i] = this.y[i]! + vyi * dt;
      this.tone[i] = this.tone[i]! + (this.baseTone[i]! + 1 - this.tone[i]!) * relax;
    }
    this.flicker(dt, 6);
  }

  private stepBlast(dt: number): void {
    const drag = dragFactor(EXPLODE_DRAG, dt);
    for (let i = 0; i < this.count; i++) {
      const vxi = this.vx[i]! * drag;
      const vyi = this.vy[i]! * drag;
      this.vx[i] = vxi;
      this.vy[i] = vyi;
      this.x[i] = this.x[i]! + vxi * dt;
      this.y[i] = this.y[i]! + vyi * dt;
    }
  }

  private stepScene(dt: number): void {
    const k = SCENE_STIFFNESS;
    const damp = dragFactor(2 * Math.sqrt(k) * SCENE_DAMPING_RATIO, dt);
    for (let i = 0; i < this.count; i++) {
      const xi = this.x[i]!;
      const yi = this.y[i]!;
      const vxi = (this.vx[i]! + (this.homeX[i]! - xi) * k * dt) * damp;
      const vyi = (this.vy[i]! + (this.homeY[i]! - yi) * k * dt) * damp;
      this.vx[i] = vxi;
      this.vy[i] = vyi;
      this.x[i] = xi + vxi * dt;
      this.y[i] = yi + vyi * dt;
    }
  }
}
