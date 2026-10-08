import type { PointerState } from '../glyph/GlyphField';

export interface PointerTrackerOptions {
  /** Repel radius for a mouse cursor, CSS px. */
  mouseRadius: number;
  /** Repel radius for a finger (a bit smaller: the finger already covers the glyphs), CSS px. */
  touchRadius: number;
  /**
   * Called with coordinates relative to the element. A mouse presses on pointer down;
   * a finger or pen presses on release if it stayed (nearly) in place, so a swipe can
   * push digits around without triggering the explosion.
   */
  onPress: (x: number, y: number) => void;
}

/** A touch counts as a tap when it moves less than this (px) and lasts less than TAP_MAX_MS. */
const TAP_MAX_DISTANCE = 12;
const TAP_MAX_MS = 600;

/**
 * Unified mouse / touch / pen tracking via Pointer Events. Exposes a reusable `state`
 * object (no allocations while moving). Elements marked `data-intro-ignore` never trigger a press.
 */
export class PointerTracker {
  readonly state: PointerState;
  private readonly element: HTMLElement;
  private readonly options: PointerTrackerOptions;
  private attached = false;
  private downX = 0;
  private downY = 0;
  private downTime = 0;
  private downIgnored = false;

  constructor(element: HTMLElement, options: PointerTrackerOptions) {
    this.element = element;
    this.options = options;
    this.state = { x: -9999, y: -9999, active: false, radius: options.mouseRadius };
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    const el = this.element;
    el.addEventListener('pointermove', this.onMove, { passive: true });
    el.addEventListener('pointerdown', this.onDown, { passive: true });
    el.addEventListener('pointerup', this.onUp, { passive: true });
    el.addEventListener('pointercancel', this.onUp, { passive: true });
    el.addEventListener('pointerleave', this.onLeave, { passive: true });
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    const el = this.element;
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointercancel', this.onUp);
    el.removeEventListener('pointerleave', this.onLeave);
    this.state.active = false;
  }

  private locate(event: PointerEvent): void {
    const rect = this.element.getBoundingClientRect();
    this.state.x = event.clientX - rect.left;
    this.state.y = event.clientY - rect.top;
    this.state.radius =
      event.pointerType === 'mouse' ? this.options.mouseRadius : this.options.touchRadius;
  }

  private readonly onMove = (event: PointerEvent): void => {
    this.locate(event);
    // A touch pointer only "hovers" while the finger is down; a mouse hovers always.
    this.state.active = event.pointerType === 'mouse' || event.buttons > 0;
  };

  private readonly onDown = (event: PointerEvent): void => {
    this.locate(event);
    this.state.active = true;
    this.downX = event.clientX;
    this.downY = event.clientY;
    this.downTime = event.timeStamp;
    this.downIgnored =
      event.target instanceof Element && event.target.closest('[data-intro-ignore]') !== null;
    if (event.pointerType === 'mouse' && !this.downIgnored)
      this.options.onPress(this.state.x, this.state.y);
  };

  private readonly onUp = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') return;
    this.state.active = false;
    if (event.type !== 'pointerup' || this.downIgnored) return;
    const moved = Math.hypot(event.clientX - this.downX, event.clientY - this.downY);
    if (moved < TAP_MAX_DISTANCE && event.timeStamp - this.downTime < TAP_MAX_MS) {
      this.locate(event);
      this.options.onPress(this.state.x, this.state.y);
    }
  };

  private readonly onLeave = (): void => {
    this.state.active = false;
  };
}
