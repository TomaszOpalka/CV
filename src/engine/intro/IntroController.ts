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
  sampleLuminance,
} from '../glyph/portrait';
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
/** How far (in ramp steps) a digit may deviate from the exact brightness match. */
const GLYPH_JITTER = 1.1;
/** Quality level -> [cell size multiplier, max device pixel ratio]. */
const QUALITY: ReadonlyArray<readonly [number, number]> = [
  [1.5, 1],
  [1.2, 1.5],
  [1, 2],
];

/**
 * Runs the whole intro: digit grid, explosion, morph into the portrait and the pixelated photo reveal.
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
  private imageReady = false;
  private targets: MorphTargets | null = null;
  private reveal: PixelateReveal | null = null;

  private width = 0;
  private height = 0;
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
  }

  // --- setup ---------------------------------------------------------------------------

  private build(): void {
    const { root } = this.o;
    this.width = root.clientWidth;
    this.height = root.clientHeight;

    const [cellScale, maxDpr] = QUALITY[this.governor.level]!;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const baseCell = this.width < 600 ? 11 : 12;
    const minCell = Math.ceil(
      Math.sqrt((this.width * this.height) / (CELL_ASPECT * MAX_PARTICLES)),
    );
    const grid = computeGrid(
      this.width,
      this.height,
      Math.max(minCell, Math.round(baseCell * cellScale)),
    );
    const family = getComputedStyle(root).getPropertyValue('--font-mono').trim() || 'monospace';

    this.renderer.resize(this.width, this.height, dpr);
    this.atlas = new GlyphAtlas(grid.cellW, grid.cellH, dpr, TONE_LEVELS, family);
    this.field = new GlyphField(grid, TONE_LEVELS);
    this.targets = this.imageReady ? this.computeTargets() : null;
  }

  private loadImage(): void {
    const image = new Image();
    image.decoding = 'async';
    const finish = (ok: boolean): void => {
      if (this.destroyed) return;
      this.image = ok ? image : null;
      this.imageReady = true;
      this.targets = ok ? this.computeTargets() : null;
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
    const particles = assignTargets(cols * rows, this.field.count);
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
      case 'morphing':
        if (this.targets) this.field.morphTo(this.targets);
        else this.dispatch('skip'); // no usable photo: go straight to the final view
        break;
      case 'revealing':
        this.field.hold();
        this.startReveal();
        break;
      case 'done':
        this.unsubscribeTicker?.();
        this.unsubscribeTicker = null;
        this.pointer.detach();
        break;
      default:
        break;
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
        if (level !== null) this.pendingResize = true; // rebuild with the new quality before the next frame
        break;
      }
      case 'exploding':
        this.field.step(dt, this.pointer.state);
        this.paintField();
        if (this.stateMs >= INTRO_DURATIONS.exploding) this.dispatch('elapsed');
        break;
      case 'morphing':
        this.field.step(dt, this.pointer.state);
        this.paintField();
        if (this.stateMs >= INTRO_DURATIONS.morphing) this.dispatch('elapsed');
        break;
      case 'revealing':
        this.updateReveal(dt);
        break;
      default:
        break;
    }
  }

  private paintField(): void {
    this.renderer.clear();
    this.renderer.drawField(this.field, this.atlas, this.field.rows);
  }

  private updateBoot(): void {
    const minBoot = INTRO_DURATIONS.boot;
    const cascadeRow = Math.floor(this.field.rows * Math.min(1, this.stateMs / BOOT_CASCADE_MS));
    this.field.step(1 / 60, this.pointer.state);
    this.renderer.clear();
    this.renderer.drawField(this.field, this.atlas, cascadeRow);

    // The counter never reaches 100 before the photo has really loaded.
    const timeShare = Math.min(1, this.stateMs / minBoot);
    const percent = Math.floor((this.imageReady ? 100 : 92) * timeShare);
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
    const widthChanged = Math.abs(root.clientWidth - this.width) > 2;
    // Mobile browser bars change the height by up to ~100 px without a real layout change.
    const heightChanged = Math.abs(root.clientHeight - this.height) > 120;
    if (!widthChanged && !heightChanged) return;

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
    if (this.state !== 'boot' && this.state !== 'idle') return;
    this.build();
  }
}
