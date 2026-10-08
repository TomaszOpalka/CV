import { PointerTracker } from '../core/PointerTracker';
import { QualityGovernor } from '../core/QualityGovernor';
import { ticker } from '../core/Ticker';
import { Canvas2DRenderer } from '../glyph/Canvas2DRenderer';
import { GlyphAtlas } from '../glyph/GlyphAtlas';
import { GlyphField, type MorphTargets } from '../glyph/GlyphField';
import {
  assignTargets,
  autoLevels,
  brightnessToGlyph,
  brightnessToTone,
  CELL_ASPECT,
  computeGrid,
  coverCrop,
  inkThreshold,
  rankAssign,
  sampleInk,
  sampleLuminance,
} from '../glyph/portrait';
import {
  INTRO_DURATIONS,
  isTimedState,
  nextIntroState,
  type IntroEvent,
  type IntroState,
} from './introMachine';
import { PixelateReveal, type Rect } from './PixelateReveal';

export interface IntroControllerOptions {
  /** Section that receives pointer input and defines the canvas size. */
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  /** The element the portrait digits settle on (and where the photo finally appears). */
  photoFrame: HTMLElement;
  imageSrc: string;
  /** Vertical focal point of the photo crop, 0 (top) .. 1 (bottom). */
  focalY: number;
  onState: (state: IntroState) => void;
  /** 0..100, called during boot (integers, only when the value changes). */
  onProgress: (percent: number) => void;
}

const TONE_LEVELS = 8;
const SAMPLE_SUPERSAMPLE = 3;
const BOOT_CASCADE_MS = 650;
/** Upper bound on glyphs per frame; very large screens get bigger digits instead of more of them. */
const MAX_PARTICLES = 16000;
/** How far (in ramp steps) a digit may deviate from the exact brightness match. */
const GLYPH_JITTER = 1.1;
/** The blueprints the digits assemble into, in order of appearance (the portrait comes last). */
type ShapeKey = 'engine' | 'f1' | 'reactor' | 'deathStar' | 'basketball';

interface ShapeSpec {
  src: string;
  /** Largest share of the canvas width / height the drawing may take. */
  fit: readonly [number, number];
  /** Same, on a narrow (portrait) screen. */
  fitNarrow: readonly [number, number];
  /** On a narrow screen turn the drawing a quarter turn (a wide F1 would be tiny otherwise). */
  rotateOnNarrow?: boolean;
}

const BLUEPRINT_DIR = '/assets/blueprints';
const SHAPES: Readonly<Record<ShapeKey, ShapeSpec>> = {
  engine: { src: `${BLUEPRINT_DIR}/engine.webp`, fit: [0.8, 0.74], fitNarrow: [0.94, 0.5] },
  f1: {
    src: `${BLUEPRINT_DIR}/f1.webp`,
    fit: [0.7, 0.46],
    fitNarrow: [0.5, 0.8],
    rotateOnNarrow: true,
  },
  reactor: { src: `${BLUEPRINT_DIR}/reactor.webp`, fit: [0.8, 0.8], fitNarrow: [0.94, 0.6] },
  deathStar: { src: `${BLUEPRINT_DIR}/death-star.webp`, fit: [0.8, 0.8], fitNarrow: [0.94, 0.6] },
  basketball: { src: `${BLUEPRINT_DIR}/basketball.webp`, fit: [0.8, 0.8], fitNarrow: [0.94, 0.6] },
};
const SHAPE_KEYS = Object.keys(SHAPES) as ShapeKey[];

/** Which blueprint each stage draws. `zooming` keeps the ball, `impact` switches to the portrait. */
const STAGE_SHAPE: Partial<Record<IntroState, ShapeKey>> = {
  morphingEngine: 'engine',
  morphingF1: 'f1',
  morphingReactor: 'reactor',
  morphingDeathStar: 'deathStar',
  morphingBasketball: 'basketball',
};

/** Detail of a blueprint is sampled this many times finer than the glyph grid. */
const SHAPE_SUPERSAMPLE = 4;
/** Cells with less ink than this get no digit at all. */
const SHAPE_MIN_INK = 0.22;
/** A blueprint never uses more than this share of all particles. */
const SHAPE_MAX_FILL = 0.7;
/** Digits on blueprint lines are drawn from a wide band of the ramp so lines look like mixed numbers. */
const SHAPE_GLYPH_JITTER = 3;
/** How far the ball grows while it flies at the camera. */
const ZOOM_MAX = 5.5;
/** Camera shake on impact: initial amplitude as a share of the smaller canvas side, and decay time. */
const SHAKE_AMPLITUDE = 0.035;
const SHAKE_DECAY_MS = 190;
const FLASH_MS = 170;
/** Spring stiffness while the ball zooms (tight) and while everything snaps into the portrait (very tight). */
const ZOOM_STIFFNESS = 120;
const IMPACT_STIFFNESS = 210;

/** F1 slides across the screen: start and end of its centre, as a share of the canvas size. */
const F1_SLIDE = { from: -0.27, to: 0.2 } as const;

const easeInOut = (t: number): number => 0.5 - 0.5 * Math.cos(Math.PI * t);
const easeInCubic = (t: number): number => t * t * t;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Where the digits of one picture go, before the field assigns them to particles. */
interface ShapeTargets {
  xs: Float32Array;
  ys: Float32Array;
  glyphs: Uint8Array;
  tones: Float32Array;
}

/** Quality level -> [cell size multiplier, max device pixel ratio]. */
const QUALITY: ReadonlyArray<readonly [number, number]> = [
  [1.5, 1],
  [1.2, 1.5],
  [1, 2],
];

/**
 * Runs the whole intro: digit grid, explosion, a chain of blueprint morphs (engine, F1, reactor,
 * Death Star, ball), the zoom into the camera with a shake, the snap into the portrait and the
 * pixelated photo reveal.
 * Owns the canvas, the pointer input and the timing. React only mirrors the coarse `IntroState`.
 */
export class IntroController {
  private readonly o: IntroControllerOptions;
  private state: IntroState = 'boot';
  private stateMs = 0;
  private destroyed = false;

  private ctx!: CanvasRenderingContext2D;
  private renderer!: Canvas2DRenderer;
  private atlas!: GlyphAtlas;
  private field!: GlyphField;
  private pointer!: PointerTracker;
  private governor!: QualityGovernor;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer = 0;
  private unsubscribeTicker: (() => void) | null = null;

  private image: HTMLImageElement | null = null;
  private shapeImages: Partial<Record<ShapeKey, HTMLImageElement>> = {};
  private imagesLeft = 0;
  private imagesTotal = 0;
  private imageReady = false;
  private targets: MorphTargets | null = null;
  private shapeTargets: Partial<Record<ShapeKey, ShapeTargets>> = {};
  private reveal: PixelateReveal | null = null;
  /** Camera shake: amplitude in px right after the impact. */
  private shakeAmplitude = 0;
  private f1Vertical = false;

  private width = 0;
  private height = 0;
  /** Cell size and DPR the scene was last built with. */
  private builtCell = 0;
  private builtDpr = 0;
  private lastProgress = -1;
  private pendingResize = false;

  constructor(options: IntroControllerOptions) {
    this.o = options;
  }

  /** Returns false when the intro cannot run here (no 2D canvas); the caller should show the final view. */
  init(): boolean {
    const ctx = this.o.canvas.getContext('2d', { alpha: true });
    if (!ctx) return false;
    this.ctx = ctx;
    this.renderer = new Canvas2DRenderer(this.o.canvas, ctx);

    const coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 600;
    this.governor = new QualityGovernor({ levels: QUALITY.length, startLevel: coarse ? 1 : 2 });

    this.pointer = new PointerTracker(this.o.root, {
      mouseRadius: 110,
      touchRadius: 80,
      onPress: (x, y) => this.press(x, y),
    });
    this.pointer.attach();

    this.build();
    this.loadImages();

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.o.root);
    this.unsubscribeTicker = ticker.add((dt) => this.update(dt));
    return true;
  }

  /** Start the explosion (mouse, touch or keyboard). Ignored outside the idle state. */
  press(x?: number, y?: number): void {
    if (this.state !== 'idle') return;
    this.field.explode(x ?? this.width / 2, y ?? this.height / 2);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')
      navigator.vibrate(25);
    this.dispatch('press');
  }

  skip(): void {
    this.dispatch('skip');
  }

  destroy(): void {
    this.destroyed = true;
    window.clearTimeout(this.resizeTimer);
    this.unsubscribeTicker?.();
    this.unsubscribeTicker = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.pointer?.detach();
  }

  // --- setup ---------------------------------------------------------------------------

  private build(): void {
    const { root } = this.o;
    this.width = root.clientWidth;
    this.height = root.clientHeight;

    const { cell, dpr } = this.settingsFor(this.governor.level);
    this.builtCell = cell;
    this.builtDpr = dpr;
    const grid = computeGrid(this.width, this.height, cell);
    const family = getComputedStyle(root).getPropertyValue('--font-mono').trim() || 'monospace';

    this.renderer.resize(this.width, this.height, dpr);
    this.atlas = new GlyphAtlas(grid.cellW, grid.cellH, dpr, TONE_LEVELS, family);
    this.field = new GlyphField(grid, TONE_LEVELS);
    if (this.imageReady) this.computeAllTargets();
  }

  /** Cell size (CSS px) and device pixel ratio for a quality level at the current size. */
  private settingsFor(level: number): { cell: number; dpr: number } {
    const [cellScale, maxDpr] = QUALITY[level]!;
    const baseCell = this.width < 600 ? 11 : 12;
    const minCell = Math.ceil(
      Math.sqrt((this.width * this.height) / (CELL_ASPECT * MAX_PARTICLES)),
    );
    return {
      cell: Math.max(minCell, Math.round(baseCell * cellScale)),
      dpr: Math.min(window.devicePixelRatio || 1, maxDpr),
    };
  }

  /** Loads the portrait and every blueprint. A picture that fails to load is simply skipped. */
  private loadImages(): void {
    const jobs: Array<{ src: string; assign: (image: HTMLImageElement | null) => void }> = [
      { src: this.o.imageSrc, assign: (image) => (this.image = image) },
      ...SHAPE_KEYS.map((key) => ({
        src: SHAPES[key].src,
        assign: (image: HTMLImageElement | null) => {
          if (image) this.shapeImages[key] = image;
        },
      })),
    ];
    this.imagesTotal = jobs.length;
    this.imagesLeft = jobs.length;

    for (const job of jobs) {
      const image = new Image();
      image.decoding = 'async';
      const finish = (ok: boolean): void => {
        if (this.destroyed) return;
        job.assign(ok ? image : null);
        this.imagesLeft--;
        if (this.imagesLeft === 0) {
          this.imageReady = true;
          this.computeAllTargets();
        }
      };
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.src = job.src;
    }
  }

  /** The photo frame's rectangle in canvas coordinates (CSS px). */
  private frameRect(): Rect {
    const root = this.o.root.getBoundingClientRect();
    const frame = this.o.photoFrame.getBoundingClientRect();
    return { x: frame.left - root.left, y: frame.top - root.top, w: frame.width, h: frame.height };
  }

  private computeTargets(): MorphTargets | null {
    const image = this.image;
    if (!image) return null;
    const rect = this.frameRect();
    if (rect.w < 8 || rect.h < 8) return null;

    const { cellW, cellH } = this.field;
    const cols = Math.max(1, Math.round(rect.w / cellW));
    const rows = Math.max(1, Math.round(rect.h / cellH));
    const sw = cols * SAMPLE_SUPERSAMPLE;
    const sh = rows * SAMPLE_SUPERSAMPLE;

    const scratch = document.createElement('canvas');
    scratch.width = sw;
    scratch.height = sh;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;

    let pixels: Uint8ClampedArray;
    try {
      const crop = coverCrop(
        image.naturalWidth || 800,
        image.naturalHeight || 1000,
        rect.w / rect.h,
        0.5,
        this.o.focalY,
      );
      sctx.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, sw, sh);
      pixels = sctx.getImageData(0, 0, sw, sh).data;
    } catch {
      return null; // tainted or undecodable image: skip the morph
    }

    const brightness = autoLevels(sampleLuminance(pixels, sw, sh, cols, rows));
    const particles = assignTargets(cols * rows, this.field.count); // replaced by a rank-based pick at impact
    const n = particles.length;
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    const glyphs = new Uint8Array(n);
    const tones = new Float32Array(n);
    const stepX = rect.w / cols;
    const stepY = rect.h / rows;
    for (let k = 0; k < n; k++) {
      xs[k] = rect.x + ((k % cols) + 0.5) * stepX;
      ys[k] = rect.y + (Math.floor(k / cols) + 0.5) * stepY;
      glyphs[k] = brightnessToGlyph(
        brightness[k]!,
        this.atlas.ramp,
        Math.random() - 0.5,
        GLYPH_JITTER,
      );
      tones[k] = brightnessToTone(brightness[k]!, TONE_LEVELS);
    }
    return { particles, xs, ys, glyphs, tones };
  }

  private computeAllTargets(): void {
    this.targets = this.computeTargets();
    this.shapeTargets = {};
    for (const key of SHAPE_KEYS) {
      const targets = this.computeShapeTargets(key);
      if (targets) this.shapeTargets[key] = targets;
    }
  }

  /** Turns one blueprint picture into digit positions, tones and glyphs, centred on the canvas. */
  private computeShapeTargets(key: ShapeKey): ShapeTargets | null {
    const image = this.shapeImages[key];
    if (!image) return null;
    const spec = SHAPES[key];
    const narrow = this.width < this.height * 0.85;
    const rotate = narrow && spec.rotateOnNarrow === true;
    const iw = image.naturalWidth || 1;
    const ih = image.naturalHeight || 1;
    const aspect = rotate ? ih / iw : iw / ih;
    const [fitW, fitH] = narrow ? spec.fitNarrow : spec.fit;

    const { cellW, cellH } = this.field;
    const w = Math.min(fitW * this.width, fitH * this.height * aspect);
    const h = w / aspect;
    const cols = Math.max(6, Math.round(w / cellW));
    const rows = Math.max(6, Math.round(h / cellH));
    const sw = cols * SHAPE_SUPERSAMPLE;
    const sh = rows * SHAPE_SUPERSAMPLE;

    const scratch = document.createElement('canvas');
    scratch.width = sw;
    scratch.height = sh;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    if (!sctx) return null;

    let pixels: Uint8ClampedArray;
    try {
      sctx.fillStyle = '#000';
      sctx.fillRect(0, 0, sw, sh);
      if (rotate) {
        sctx.translate(sw / 2, sh / 2);
        sctx.rotate(-Math.PI / 2);
        sctx.drawImage(image, -sh / 2, -sw / 2, sh, sw);
      } else {
        sctx.drawImage(image, 0, 0, sw, sh);
      }
      pixels = sctx.getImageData(0, 0, sw, sh).data;
    } catch {
      return null;
    }

    // "Ink" = distance from the paper colour, so white-on-blue, cyan-on-black etc. all work.
    const ink = autoLevels(sampleInk(pixels, sw, sh, cols, rows), 0.5, 0.995, 0.9);
    const threshold = inkThreshold(
      ink,
      SHAPE_MIN_INK,
      Math.floor(this.field.count * SHAPE_MAX_FILL),
    );

    let count = 0;
    for (let i = 0; i < ink.length; i++) if (ink[i]! >= threshold) count++;
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const glyphs = new Uint8Array(count);
    const tones = new Float32Array(count);
    const stepX = w / cols;
    const stepY = h / rows;
    const x0 = (this.width - w) / 2;
    const y0 = (this.height - h) / 2;
    let n = 0;
    for (let i = 0; i < ink.length; i++) {
      const v = ink[i]!;
      if (v < threshold) continue;
      xs[n] = x0 + ((i % cols) + 0.5) * stepX;
      ys[n] = y0 + (Math.floor(i / cols) + 0.5) * stepY;
      glyphs[n] = brightnessToGlyph(v, this.atlas.ramp, Math.random() - 0.5, SHAPE_GLYPH_JITTER);
      tones[n] = Math.min(TONE_LEVELS - 1, 2 + Math.round(v * (TONE_LEVELS - 3)));
      n++;
    }
    if (key === 'f1') this.f1Vertical = rotate;
    return { xs, ys, glyphs, tones };
  }

  // --- state machine -------------------------------------------------------------------

  private dispatch(event: IntroEvent): void {
    const next = nextIntroState(this.state, event);
    if (next === this.state) return;
    this.state = next;
    this.stateMs = 0;
    this.onEnter(next);
    // onEnter may have moved on already (e.g. no usable photo -> skip). Never report a stale state.
    if (this.state === next) this.o.onState(next);
  }

  private onEnter(state: IntroState): void {
    const shape = STAGE_SHAPE[state];
    if (shape) {
      this.enterShape(shape);
      return;
    }
    switch (state) {
      case 'zooming':
        this.field.stiffness = ZOOM_STIFFNESS;
        break;
      case 'impact':
        this.enterImpact();
        break;
      case 'revealing':
        this.field.resetTransform();
        this.field.hold();
        this.startReveal();
        break;
      case 'done':
        this.unsubscribeTicker?.();
        this.unsubscribeTicker = null;
        this.pointer.detach();
        // Nothing needs the scene any more: drop what is big (the owner then drops the controller).
        this.resizeObserver?.disconnect();
        this.resizeObserver = null;
        window.clearTimeout(this.resizeTimer);
        this.reveal = null;
        this.targets = null;
        this.shapeTargets = {};
        this.shapeImages = {};
        this.image = null;
        break;
      default:
        break;
    }
  }

  /** Send the digits into a blueprint. Without that picture the stage is skipped. */
  private enterShape(key: ShapeKey): void {
    const shape = this.shapeTargets[key];
    if (!shape) {
      this.dispatch('elapsed');
      return;
    }
    this.field.resetTransform();
    this.field.anchorX = this.width / 2;
    this.field.anchorY = this.height / 2;
    this.assign(shape);
    if (key === 'f1') this.slideF1(0);
  }

  /** Ranked assignment: the digits that are on the left now become the left part of the next picture. */
  private assign(shape: ShapeTargets, maxDelay?: number): void {
    const particles = rankAssign(
      this.field.x,
      this.field.y,
      this.field.count,
      shape.xs,
      shape.ys,
      this.field.cellH,
    );
    this.field.morphTo({ particles, ...shape }, maxDelay);
  }

  private enterImpact(): void {
    if (!this.targets) {
      this.dispatch('skip');
      return;
    }
    this.field.resetTransform();
    this.field.stiffness = IMPACT_STIFFNESS;
    this.field.flash();
    this.assign(this.targets, 0.06);
    this.shakeAmplitude = SHAKE_AMPLITUDE * Math.min(this.width, this.height);
  }

  /** The F1 drives across the screen: its targets slide, the digits chase them. */
  private slideF1(progress: number): void {
    const e = easeInOut(clamp01(progress));
    const share = F1_SLIDE.from + (F1_SLIDE.to - F1_SLIDE.from) * e;
    if (this.f1Vertical) {
      this.field.offsetX = 0;
      this.field.offsetY = -share * this.height; // driving upwards on a narrow screen
    } else {
      this.field.offsetX = share * this.width;
      this.field.offsetY = 0;
    }
  }

  private startReveal(): void {
    const image = this.image;
    if (!image) {
      this.dispatch('skip');
      return;
    }
    const rect = this.frameRect();
    const crop = coverCrop(
      image.naturalWidth || 800,
      image.naturalHeight || 1000,
      rect.w / rect.h,
      0.5,
      this.o.focalY,
    );
    try {
      this.reveal = new PixelateReveal(image, crop, rect, this.renderer.dpr);
    } catch {
      this.dispatch('skip');
    }
  }

  // --- frame loop ----------------------------------------------------------------------

  private update(deltaMs: number): void {
    if (this.destroyed || this.state === 'done') return;
    if (this.pendingResize) this.applyResize();

    const dt = Math.min(deltaMs, 50) / 1000;
    this.stateMs += deltaMs;

    switch (this.state) {
      case 'boot':
        this.updateBoot();
        break;
      case 'idle': {
        this.field.step(dt, this.pointer.state);
        this.renderer.clear();
        this.renderer.drawField(this.field, this.atlas, this.field.rows);
        const level = this.governor.record(deltaMs);
        if (level !== null) {
          // Large screens can map several levels onto the same settings: rebuild only if something changes.
          const next = this.settingsFor(level);
          if (next.cell !== this.builtCell || next.dpr !== this.builtDpr) this.pendingResize = true;
        }
        break;
      }
      case 'revealing':
        this.updateReveal(dt);
        break;
      default:
        if (isTimedState(this.state)) this.updateSequence(dt);
        break;
    }
  }

  /** The stages between the click and the photo: explosion, blueprints, zoom, impact. */
  private updateSequence(dt: number): void {
    const state = this.state;
    const duration = INTRO_DURATIONS[state as keyof typeof INTRO_DURATIONS];
    const progress = clamp01(this.stateMs / duration);

    if (state === 'morphingF1') this.slideF1(progress);
    if (state === 'zooming') this.field.scale = 1 + (ZOOM_MAX - 1) * easeInCubic(progress);

    this.field.step(dt, this.pointer.state);
    this.paintField();
    if (state === 'impact') this.paintImpactFlash();

    if (this.stateMs >= duration) this.dispatch('elapsed');
  }

  private paintImpactFlash(): void {
    if (this.stateMs >= FLASH_MS) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.5 * (1 - this.stateMs / FLASH_MS);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, this.o.canvas.width, this.o.canvas.height);
    ctx.restore();
  }
  private paintField(): void {
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeAmplitude > 0) {
      const decay = Math.exp(-this.stateMs / SHAKE_DECAY_MS);
      const amplitude = this.shakeAmplitude * decay;
      shakeX = (Math.random() * 2 - 1) * amplitude;
      shakeY = (Math.random() * 2 - 1) * amplitude;
      if (decay < 0.02) this.shakeAmplitude = 0;
    }
    this.renderer.clear();
    this.renderer.drawField(
      this.field,
      this.atlas,
      this.field.rows,
      this.field.scale,
      shakeX,
      shakeY,
    );
  }

  private updateBoot(): void {
    const minBoot = INTRO_DURATIONS.boot;
    const cascadeRow = Math.floor(this.field.rows * Math.min(1, this.stateMs / BOOT_CASCADE_MS));
    this.field.step(1 / 60, this.pointer.state);
    this.renderer.clear();
    this.renderer.drawField(this.field, this.atlas, cascadeRow);

    // The counter never reaches 100 before the photo has really loaded.
    const timeShare = Math.min(1, this.stateMs / minBoot);
    const loaded = this.imagesTotal > 0 ? 1 - this.imagesLeft / this.imagesTotal : 0;
    const percent = Math.floor(Math.min(timeShare * 100, 8 + 92 * loaded));
    if (percent !== this.lastProgress) {
      this.lastProgress = percent;
      this.o.onProgress(percent);
    }
    if (this.imageReady && this.stateMs >= minBoot) this.dispatch('ready');
  }

  private updateReveal(dt: number): void {
    this.field.fade(dt, 4);
    this.renderer.clear();
    this.renderer.drawField(this.field, this.atlas, this.field.rows);
    const progress = Math.min(1, this.stateMs / INTRO_DURATIONS.revealing);
    this.reveal?.draw(this.ctx, progress);
    if (progress >= 1) this.dispatch('elapsed');
  }

  // --- resize --------------------------------------------------------------------------

  private onResize(): void {
    if (this.destroyed || this.state === 'done') return;
    const root = this.o.root;
    // The section is min-height: 100svh (the *small* viewport), so mobile browser bars do not change it:
    // any real size change means a real layout change and the canvas bitmap must follow.
    const changed =
      Math.abs(root.clientWidth - this.width) > 2 || Math.abs(root.clientHeight - this.height) > 2;
    if (!changed) return;

    if (this.state === 'boot' || this.state === 'idle') {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        this.pendingResize = true;
      }, 120);
    } else {
      this.dispatch('skip'); // the layout changed mid-animation: jump to the final view
    }
  }

  private applyResize(): void {
    this.pendingResize = false;
    if (this.state !== 'boot' && this.state !== 'idle') {
      // The layout changed after the user already started the animation: the grid and the portrait
      // targets are stale, so jump to the final view instead of showing a misplaced portrait.
      this.dispatch('skip');
      return;
    }
    this.build();
    this.governor.rearm();
  }
}
