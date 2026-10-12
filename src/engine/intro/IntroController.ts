import { PointerTracker } from '../core/PointerTracker';
import { QualityGovernor } from '../core/QualityGovernor';
import { ticker } from '../core/Ticker';
import { Canvas2DRenderer } from '../glyph/Canvas2DRenderer';
import { GlyphAtlas } from '../glyph/GlyphAtlas';
import { GlyphField } from '../glyph/GlyphField';
import {
  autoLevels,
  CELL_ASPECT,
  computeGrid,
  coverCrop,
  localContrast,
  sampleLuminance,
} from '../glyph/portrait';
import { IntroSequence } from '../scene/IntroSequence';
import { INTRO_DURATIONS, nextIntroState, type IntroEvent, type IntroState } from './introMachine';
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

/** Quality level -> [cell size multiplier, max device pixel ratio]. */
const QUALITY: ReadonlyArray<readonly [number, number]> = [
  [1.5, 1],
  [1.2, 1.5],
  [1, 2],
];

/** The portrait as brightness per grid cell (0 outside the photo frame) and a mask of the cells it covers. */
interface PortraitMap {
  brightness: Float32Array;
  inside: Uint8Array;
}

/**
 * Runs the whole intro: digit grid, explosion, the film (see `IntroSequence`: V8, F1, smoke,
 * basketball, reactor, Death Star, explosion, Matrix rain that turns into the portrait) and
 * the pixelated photo reveal.
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
  private sequence: IntroSequence | null = null;
  private pointer!: PointerTracker;
  private governor!: QualityGovernor;
  private resizeObserver: ResizeObserver | null = null;
  private resizeTimer = 0;
  private unsubscribeTicker: (() => void) | null = null;

  private image: HTMLImageElement | null = null;
  private imageReady = false;
  private reveal: PixelateReveal | null = null;

  private width = 0;
  private height = 0;
  /** Cell size and DPR the scene was last built with. */
  private builtCell = 0;
  private builtDpr = 0;
  private lastProgress = -1;
  private pendingResize = false;
  private act = '';

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

    try {
      this.build();
    } catch {
      return false; // e.g. no second canvas for the scene
    }
    this.loadImage();

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
    this.sequence = null;
    this.o.root.removeAttribute('data-act');
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
    this.sequence = new IntroSequence(grid, this.field.count);
    if (this.imageReady) this.attachPortrait();
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

  /** Loads the portrait. A photo that fails to load simply means the intro ends in the final view. */
  private loadImage(): void {
    const image = new Image();
    image.decoding = 'async';
    const finish = (ok: boolean): void => {
      if (this.destroyed) return;
      this.image = ok ? image : null;
      this.imageReady = true;
      if (ok) this.attachPortrait();
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = this.o.imageSrc;
  }

  /** The photo frame's rectangle in canvas coordinates (CSS px). */
  private frameRect(): Rect {
    const root = this.o.root.getBoundingClientRect();
    const frame = this.o.photoFrame.getBoundingClientRect();
    return { x: frame.left - root.left, y: frame.top - root.top, w: frame.width, h: frame.height };
  }

  private attachPortrait(): void {
    const map = this.computePortrait();
    if (map) this.sequence?.setPortrait(map.brightness, map.inside);
  }

  /** Samples the photo at the resolution of the digit grid, placed where the photo frame is. */
  private computePortrait(): PortraitMap | null {
    const image = this.image;
    if (!image) return null;
    const rect = this.frameRect();
    if (rect.w < 8 || rect.h < 8) return null;

    const { cols: fieldCols, rows: fieldRows, cellW, cellH } = this.field;
    const col0 = Math.min(fieldCols - 1, Math.max(0, Math.round(rect.x / cellW)));
    const row0 = Math.min(fieldRows - 1, Math.max(0, Math.round(rect.y / cellH)));
    const cols = Math.min(fieldCols - col0, Math.max(1, Math.round(rect.w / cellW)));
    const rows = Math.min(fieldRows - row0, Math.max(1, Math.round(rect.h / cellH)));
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
      return null; // tainted or undecodable image: skip the film
    }

    const levels = autoLevels(
      localContrast(sampleLuminance(pixels, sw, sh, cols, rows), cols, rows, 3, 1.4),
      0.03,
      0.97,
      0.85,
    );
    const brightness = new Float32Array(this.field.count);
    const inside = new Uint8Array(this.field.count);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = (row0 + r) * fieldCols + col0 + c;
        brightness[i] = levels[r * cols + c]!;
        inside[i] = 1;
      }
    }
    return { brightness, inside };
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
    switch (state) {
      case 'playing':
        if (!this.sequence?.hasPortrait) {
          this.dispatch('skip');
          return;
        }
        this.field.beginScene();
        break;
      case 'revealing':
        this.setAct('');
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
        this.sequence = null;
        this.image = null;
        this.setAct('');
        break;
      default:
        break;
    }
  }

  private setAct(act: string): void {
    if (act === this.act) return;
    this.act = act;
    if (act) this.o.root.setAttribute('data-act', act);
    else this.o.root.removeAttribute('data-act');
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
      case 'exploding':
        this.field.step(dt, this.pointer.state);
        this.renderer.clear();
        this.renderer.drawField(this.field, this.atlas, this.field.rows);
        if (this.stateMs >= INTRO_DURATIONS.exploding) this.dispatch('elapsed');
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'revealing':
        this.updateReveal(dt);
        break;
      default:
        break;
    }
  }

  private updatePlaying(dt: number): void {
    const sequence = this.sequence;
    if (!sequence) return;
    const t = Math.min(this.stateMs, INTRO_DURATIONS.playing) / 1000;
    sequence.frame(this.field, this.atlas.ramp, dt, t);
    this.field.step(dt, this.pointer.state);
    this.renderer.clear();
    this.renderer.drawField(this.field, this.atlas, this.field.rows);
    this.setAct(sequence.act(t));
    if (this.stateMs >= INTRO_DURATIONS.playing) this.dispatch('elapsed');
  }

  private updateBoot(): void {
    const minBoot = INTRO_DURATIONS.boot;
    const cascadeRow = Math.floor(this.field.rows * Math.min(1, this.stateMs / BOOT_CASCADE_MS));
    this.field.step(1 / 60, this.pointer.state);
    this.renderer.clear();
    this.renderer.drawField(this.field, this.atlas, cascadeRow);

    // The counter never reaches 100 before the photo has really loaded.
    const timeShare = Math.min(1, this.stateMs / minBoot);
    const percent = Math.floor(Math.min(timeShare * 100, this.imageReady ? 100 : 92));
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
