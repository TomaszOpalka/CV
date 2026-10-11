import { QualityGovernor } from '../core/QualityGovernor';
import { ticker } from '../core/Ticker';
import { setCursorPaused } from '../cursor/cursorGate';
import { drawGlyph, makeAtlas } from '../glyph/drawGlyph';
import type { GlyphAtlas } from '../glyph/GlyphAtlas';
import { CELL_ASPECT } from '../glyph/portrait';
import { HEAT_RAMP } from './heatPalette';
import { CHARGE_SECONDS, PixelField, type HeatInput } from './PixelField';

const MAX_PIXELS = 16000;
const MAX_SHAKE_PX = 10;
/** Brightness of the cold digits: the faint wall of numbers you see before anything heats up. */
const COLD_TONE = 1;
/** The page colour (--gray-1000): lit digits are drawn on a patch of it, so the cold digit under them is hidden. */
const PAGE_COLOR = '#0b0b0b';
/** The field is mostly dim digits; a device pixel ratio above this adds fill cost and no visible sharpness. */
const MAX_DPR = 1.5;
/** Digit size per quality level (0 = the coarsest, fewest sprites). The governor steps down when frames get slow. */
const QUALITY_SCALE: readonly number[] = [1.6, 1.25, 1];

export interface PixelFieldControllerOptions {
  canvas: HTMLCanvasElement;
  /** Element that shakes on the explosion (gets a `transform`). */
  shakeTarget: HTMLElement;
  onExplode: () => void;
  onCleared: () => void;
}

function cellHeightFor(width: number): number {
  return width < 600 ? 11 : 12;
}

/**
 * Drives a PixelField on a 2D canvas that spans the full width of the page: sizing (DPR, ResizeObserver),
 * digits from the shared glyph atlas (the cold wall of digits is pre-rendered once into an offscreen layer),
 * pointer (hover heats, holding makes the heat grow and finally explodes the field), one shared ticker
 * subscription that runs only while the canvas is on screen and the tab is visible, batched drawing
 * shake and vibration on the explosion.
 */
export class PixelFieldController {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly options: PixelFieldControllerOptions;
  private readonly resizeObserver: ResizeObserver;
  private readonly visibilityObserver: IntersectionObserver;
  private readonly input: HeatInput = { x: -9999, y: -9999, active: false, hold: 0 };
  private field: PixelField | null = null;
  private atlas: GlyphAtlas | null = null;
  private coldLayer: HTMLCanvasElement | null = null;
  private coldCtx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private width = 0;
  private height = 0;
  private unsubscribe: (() => void) | null = null;
  private onScreen = false;
  private holding = false;
  private clearedNotified = false;
  private readonly governor: QualityGovernor;
  private builtLevel: number;
  private pendingRebuild = false;

  constructor(options: PixelFieldControllerOptions) {
    this.options = options;
    this.canvas = options.canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;
    // Phones start one step down: they have the least headroom.
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.governor = new QualityGovernor({
      levels: QUALITY_SCALE.length,
      startLevel: coarse ? 1 : QUALITY_SCALE.length - 1,
    });
    this.builtLevel = this.governor.level;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.visibilityObserver = new IntersectionObserver((entries) => {
      this.onScreen = entries.some((entry) => entry.isIntersecting);
      this.syncLoop();
    });
  }

  init(): void {
    this.resize();
    const el = this.canvas;
    el.addEventListener('pointermove', this.onMove, { passive: true });
    el.addEventListener('pointerdown', this.onDown, { passive: true });
    el.addEventListener('pointerup', this.onUp, { passive: true });
    el.addEventListener('pointercancel', this.onUp, { passive: true });
    el.addEventListener('pointerleave', this.onLeave, { passive: true });
    this.resizeObserver.observe(el);
    this.visibilityObserver.observe(el);
    document.addEventListener('visibilitychange', this.syncLoop);
  }

  /** Start the explosion at a point (CSS px inside the canvas); no arguments means the centre. */
  explode(x?: number, y?: number): void {
    const field = this.field;
    if (!field || field.phase !== 'idle') return;
    field.explode(x ?? this.width / 2, y ?? this.height / 2);
    this.holding = false;
    // Nothing else may compete for the frame while the digits fly (the cursor draws nothing for a moment).
    setCursorPaused(true);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(40);
    this.options.onExplode();
    this.syncLoop();
  }

  /** Put the pixels back (used by the "rebuild" button). */
  reset(): void {
    if (!this.field) return;
    this.field.reset();
    this.input.hold = 0;
    this.clearedNotified = false;
    setCursorPaused(false);
    this.applyShake(0);
    this.syncLoop();
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    const el = this.canvas;
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointercancel', this.onUp);
    el.removeEventListener('pointerleave', this.onLeave);
    this.resizeObserver.disconnect();
    this.visibilityObserver.disconnect();
    document.removeEventListener('visibilitychange', this.syncLoop);
    setCursorPaused(false);
    this.applyShake(0);
  }

  private locate(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.input.x = event.clientX - rect.left;
    this.input.y = event.clientY - rect.top;
  }

  private readonly onMove = (event: PointerEvent): void => {
    this.locate(event);
    this.input.active = event.pointerType === 'mouse' || this.holding;
  };

  private readonly onDown = (event: PointerEvent): void => {
    if (!event.isPrimary || event.button !== 0) return;
    this.locate(event);
    this.holding = true;
    this.input.active = true;
  };

  private readonly onUp = (): void => {
    this.holding = false;
    if (this.input.hold < 0.05) this.input.active = false;
  };

  private readonly onLeave = (): void => {
    this.holding = false;
    this.input.active = false;
  };

  private readonly syncLoop = (): void => {
    const shouldRun =
      this.onScreen && document.visibilityState === 'visible' && this.field !== null;
    if (shouldRun && !this.unsubscribe) {
      // Coming back into view the first frames are slow for reasons that have nothing to do with the field.
      this.governor.rearm();
      this.unsubscribe = ticker.add((deltaMs) => this.frame(deltaMs / 1000));
    } else if (!shouldRun && this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    // The cursor is held back only while the explosion is actually running (not when it is scrolled out of view).
    setCursorPaused(shouldRun && this.field?.phase === 'exploding');
  };

  private resize(force = false): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width === 0 || height === 0) return;
    if (!force && width === this.width && height === this.height && this.field) return;
    this.width = width;
    this.height = height;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    this.builtLevel = this.governor.level;
    let cellH = Math.round(cellHeightFor(width) * QUALITY_SCALE[this.builtLevel]!);
    while ((width / (cellH * CELL_ASPECT)) * (height / cellH) > MAX_PIXELS) cellH += 2;
    const cellW = cellH * CELL_ASPECT;
    // A resize in the middle of an explosion keeps what is flying; an idle field is rebuilt to the new size.
    if (this.field && this.field.phase !== 'idle') return;
    this.field = new PixelField(Math.ceil(width / cellW), Math.ceil(height / cellH), cellW, cellH);
    this.atlas = makeAtlas(cellW, cellH, dpr);
    this.coldLayer = this.renderColdLayer(this.field, this.atlas);
    this.coldCtx = this.coldLayer.getContext('2d');
    this.syncLoop();
  }

  /** The whole wall of faint digits, drawn once; every frame it is a single drawImage. */
  private renderColdLayer(field: PixelField, atlas: GlyphAtlas): HTMLCanvasElement {
    const layer = document.createElement('canvas');
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext('2d');
    if (!ctx) return layer;
    const gw = atlas.glyphW;
    const gh = atlas.glyphH;
    for (let i = 0; i < field.count; i++) {
      drawGlyph(
        ctx,
        atlas,
        field.glyph[i]!,
        0,
        COLD_TONE,
        field.homeX[i]! * this.dpr - gw / 2,
        field.homeY[i]! * this.dpr - gh / 2,
      );
    }
    return layer;
  }

  private frame(dt: number): void {
    const field = this.field;
    if (!field) return;
    const step = Math.min(dt, 0.05);

    // Holding charges the field; letting go drains the charge quickly so the spot shrinks smoothly.
    const input = this.input;
    input.hold = this.holding ? input.hold + step : Math.max(0, input.hold - step * 2.5);
    if (this.holding && field.phase === 'idle' && input.hold >= CHARGE_SECONDS) {
      this.explode(input.x, input.y);
    }

    // Slow frames step the digit size up (fewer sprites); the change is applied while the field is idle.
    if (this.governor.record(dt * 1000) !== null) this.pendingRebuild = true;
    if (this.pendingRebuild && field.phase === 'idle' && !this.holding) {
      this.pendingRebuild = false;
      if (this.governor.level !== this.builtLevel) {
        this.resize(true);
        this.governor.rearm();
        return;
      }
    }

    field.step(step, input);
    this.eraseLeftCells(field);
    this.draw(field);
    this.applyShake(field.shake());
    if (field.phase === 'cleared' && !this.clearedNotified) {
      this.clearedNotified = true;
      setCursorPaused(false);
      this.options.onCleared();
    }
  }

  /** A plain `transform` on the stage (compositor only); a CSS variable here would re-style the whole subtree every frame. */
  private applyShake(amount: number): void {
    const target = this.options.shakeTarget;
    if (amount <= 0) {
      target.style.removeProperty('transform');
      return;
    }
    const a = amount * MAX_SHAKE_PX;
    const x = (Math.random() - 0.5) * 2 * a;
    const y = (Math.random() - 0.5) * 2 * a;
    target.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  /** Cells the shockwave just passed lose their cold digit for good: one clearRect each, once. */
  private eraseLeftCells(field: PixelField): void {
    const ctx = this.coldCtx;
    const atlas = this.atlas;
    if (!ctx || !atlas || field.leftCount === 0) return;
    const gw = atlas.glyphW;
    const gh = atlas.glyphH;
    for (let k = 0; k < field.leftCount; k++) {
      const i = field.leftGrid[k]!;
      ctx.clearRect(
        field.homeX[i]! * this.dpr - gw / 2 - 1,
        field.homeY[i]! * this.dpr - gh / 2 - 1,
        gw + 2,
        gh + 2,
      );
    }
  }

  private draw(field: PixelField): void {
    const ctx = this.ctx;
    const atlas = this.atlas;
    if (!atlas) return;
    const scale = this.dpr;
    const gw = atlas.glyphW;
    const gh = atlas.glyphH;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (field.phase === 'cleared') return;

    // The cold wall is one image. Lit digits that are still on the grid sit on a patch of page colour (no
    // composite-mode change, no big path); thrown digits fly over whatever is left of the wall.
    if (this.coldLayer) ctx.drawImage(this.coldLayer, 0, 0);
    // Two passes, so the GPU can batch: first every patch of page colour, then every digit (one atlas image).
    const patch = ctx;
    patch.fillStyle = PAGE_COLOR;
    for (let i = 0; i < field.count; i++) {
      // The faintest step looks the same as the cold digit: skip it (a third fewer sprites at the edge of the heat).
      if (field.bucket[i]! < 1 || field.attached[i] === 0) continue;
      patch.fillRect(
        field.x[i]! * scale - gw / 2 - 1,
        field.y[i]! * scale - gh / 2 - 1,
        gw + 2,
        gh + 2,
      );
    }
    for (let i = 0; i < field.count; i++) {
      const bucket = field.bucket[i]!;
      if (bucket < 1) continue;
      const shade = HEAT_RAMP[bucket]!;
      drawGlyph(
        ctx,
        atlas,
        field.glyph[i]!,
        shade.palette,
        shade.tone,
        field.x[i]! * scale - gw / 2,
        field.y[i]! * scale - gh / 2,
      );
    }
  }
}
