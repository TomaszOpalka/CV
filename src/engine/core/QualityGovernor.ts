export interface QualityGovernorOptions {
  /** Number of quality levels (0 = lowest). */
  levels: number;
  startLevel: number;
  /** Drop one level when the average fps stays below this. */
  lowFps?: number;
  /** Raise one level when the average fps stays above this for `raiseAfter` evaluations. */
  highFps?: number;
  /** Frames per evaluation window. */
  window?: number;
  /** Frames to ignore at the start (shader compile, layout, image decode). */
  warmup?: number;
  raiseAfter?: number;
}

/**
 * Watches frame times and suggests a quality level with hysteresis, so the animation
 * degrades gracefully on slow phones instead of stuttering.
 */
export class QualityGovernor {
  level: number;
  private readonly maxLevel: number;
  private readonly lowFps: number;
  private readonly highFps: number;
  private readonly windowSize: number;
  private readonly raiseAfter: number;
  private warmupLeft: number;
  private frames = 0;
  private timeMs = 0;
  private goodWindows = 0;

  constructor(options: QualityGovernorOptions) {
    this.maxLevel = options.levels - 1;
    this.level = Math.min(this.maxLevel, Math.max(0, options.startLevel));
    this.lowFps = options.lowFps ?? 46;
    this.highFps = options.highFps ?? 58;
    this.windowSize = options.window ?? 30;
    this.warmupLeft = options.warmup ?? 20;
    this.raiseAfter = options.raiseAfter ?? 3;
  }

  /** Feed one frame time. Returns the new level when it changed, otherwise null. */
  record(deltaMs: number): number | null {
    if (this.warmupLeft > 0) {
      this.warmupLeft--;
      return null;
    }
    this.frames++;
    this.timeMs += deltaMs;
    if (this.frames < this.windowSize) return null;

    const fps = (this.frames * 1000) / this.timeMs;
    this.frames = 0;
    this.timeMs = 0;

    if (fps < this.lowFps && this.level > 0) {
      this.level--;
      this.goodWindows = 0;
      return this.level;
    }
    if (fps > this.highFps && this.level < this.maxLevel) {
      this.goodWindows++;
      if (this.goodWindows >= this.raiseAfter) {
        this.level++;
        this.goodWindows = 0;
        return this.level;
      }
      return null;
    }
    this.goodWindows = 0;
    return null;
  }
}
