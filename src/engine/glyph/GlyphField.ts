import { dragFactor, explosionSpeed, falloff } from './forces';
import type { Grid } from './portrait';

export type FieldPhase = 'idle' | 'explode' | 'morph' | 'hold';

export interface PointerState {
  x: number;
  y: number;
  active: boolean;
  /** Repel radius in CSS px. */
  radius: number;
}

export interface MorphTargets {
  /** Particle index for each target. */
  particles: Uint32Array;
  xs: Float32Array;
  ys: Float32Array;
  glyphs: Uint8Array;
  /** Tone level 0..levels-1 for each target. */
  tones: Float32Array;
}

const HOME_STIFFNESS = 38;
const HOME_DAMPING = 9;
const REPEL_ACCEL = 2600;
const EXPLODE_DRAG = 1.9;
const EXPLODE_STRENGTH = 1500;
const DEFAULT_MORPH_STIFFNESS = 70;
/** Damping ratio of the morph spring (slightly under-damped: a little overshoot looks alive). */
const MORPH_DAMPING_RATIO = 0.72;
const MORPH_MAX_DELAY = 0.28;
const FLICKER_PER_SECOND = 0.7;
const SNAP_DISTANCE_SQ = 36;

/**
 * Structure-of-arrays particle system for the digit grid. One particle per grid cell.
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
  readonly targetX: Float32Array;
  readonly targetY: Float32Array;
  readonly delay: Float32Array;
  readonly tone: Float32Array;
  readonly baseTone: Float32Array;
  readonly targetTone: Float32Array;
  readonly glyph: Uint8Array;
  readonly targetGlyph: Uint8Array;
  readonly hasTarget: Uint8Array;
  readonly rowOf: Uint16Array;

  phase: FieldPhase = 'idle';
  phaseTime = 0;

  /** Spring stiffness pulling particles to their targets; raise it for a snappy morph. */
  stiffness = DEFAULT_MORPH_STIFFNESS;
  /** The whole target shape can slide (px) and zoom around an anchor while particles follow it. */
  offsetX = 0;
  offsetY = 0;
  scale = 1;
  anchorX = 0;
  anchorY = 0;

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
    this.targetX = new Float32Array(n);
    this.targetY = new Float32Array(n);
    this.delay = new Float32Array(n);
    this.tone = new Float32Array(n);
    this.baseTone = new Float32Array(n);
    this.targetTone = new Float32Array(n);
    this.glyph = new Uint8Array(n);
    this.targetGlyph = new Uint8Array(n);
    this.hasTarget = new Uint8Array(n);
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
      case 'morph':
        this.stepMorph(dt);
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

  /** Resting transform of the target shape (no slide, no zoom). */
  resetTransform(): void {
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.stiffness = DEFAULT_MORPH_STIFFNESS;
  }

  /** Light every glyph up at once (used for the impact flash). */
  flash(): void {
    this.tone.fill(this.toneLevels - 1);
  }

  /** Send the targeted particles to their targets; the rest drift and fade out. */
  morphTo(targets: MorphTargets, maxDelay = MORPH_MAX_DELAY): void {
    this.hasTarget.fill(0);
    for (let k = 0; k < targets.particles.length; k++) {
      const i = targets.particles[k]!;
      this.hasTarget[i] = 1;
      this.targetX[i] = targets.xs[k]!;
      this.targetY[i] = targets.ys[k]!;
      this.targetGlyph[i] = targets.glyphs[k]!;
      this.targetTone[i] = targets.tones[k]!;
      this.delay[i] = this.rng() * maxDelay;
    }
    this.phase = 'morph';
    this.phaseTime = 0;
  }

  /**
   * Freeze motion (used while the photo takes over). Targeted particles snap onto their targets
   * first, so a slow device that did not finish the morph in time still shows a complete portrait.
   */
  hold(): void {
    for (let i = 0; i < this.count; i++) {
      if (!this.hasTarget[i]) continue;
      this.x[i] = this.targetX[i]!;
      this.y[i] = this.targetY[i]!;
      this.glyph[i] = this.targetGlyph[i]!;
    }
    this.phase = 'hold';
    this.phaseTime = 0;
  }

  fade(dt: number, rate: number): void {
    const k = dragFactor(rate, dt);
    for (let i = 0; i < this.count; i++) this.tone[i] = this.tone[i]! * k;
  }

  /** Largest distance between a targeted particle and its target. Handy for tests and tuning. */
  maxTargetError(): number {
    let max = 0;
    for (let i = 0; i < this.count; i++) {
      if (!this.hasTarget[i]) continue;
      const goalX = this.anchorX + (this.targetX[i]! - this.anchorX) * this.scale + this.offsetX;
      const goalY = this.anchorY + (this.targetY[i]! - this.anchorY) * this.scale + this.offsetY;
      max = Math.max(max, Math.hypot(goalX - this.x[i]!, goalY - this.y[i]!));
    }
    return max;
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

  private stepMorph(dt: number): void {
    const t = this.phaseTime;
    const k = this.stiffness;
    const damp = dragFactor(2 * Math.sqrt(k) * MORPH_DAMPING_RATIO, dt);
    const drag = dragFactor(EXPLODE_DRAG, dt);
    const toneEase = Math.min(1, 9 * dt);
    const fadeOut = dragFactor(2.6, dt);
    const { scale, anchorX, anchorY, offsetX, offsetY } = this;

    for (let i = 0; i < this.count; i++) {
      const xi = this.x[i]!;
      const yi = this.y[i]!;

      if (this.hasTarget[i] && t >= this.delay[i]!) {
        const goalX = anchorX + (this.targetX[i]! - anchorX) * scale + offsetX;
        const goalY = anchorY + (this.targetY[i]! - anchorY) * scale + offsetY;
        const ex = goalX - xi;
        const ey = goalY - yi;
        const vxi = (this.vx[i]! + ex * k * dt) * damp;
        const vyi = (this.vy[i]! + ey * k * dt) * damp;
        this.vx[i] = vxi;
        this.vy[i] = vyi;
        this.x[i] = xi + vxi * dt;
        this.y[i] = yi + vyi * dt;

        if (ex * ex + ey * ey < SNAP_DISTANCE_SQ * scale * scale) {
          this.glyph[i] = this.targetGlyph[i]!;
        } else if (this.rng() < 0.12) {
          this.glyph[i] = Math.floor(this.rng() * 10);
        }
        this.tone[i] = this.tone[i]! + (this.targetTone[i]! - this.tone[i]!) * toneEase;
      } else {
        const vxi = this.vx[i]! * drag;
        const vyi = this.vy[i]! * drag;
        this.vx[i] = vxi;
        this.vy[i] = vyi;
        this.x[i] = xi + vxi * dt;
        this.y[i] = yi + vyi * dt;
        if (!this.hasTarget[i]) {
          const faded = this.tone[i]! * fadeOut;
          this.tone[i] = faded < 0.3 ? 0 : faded;
        }
      }
    }
  }
}
