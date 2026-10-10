import { FIRE, WHITE } from '../glyph/palette';

/** A digit colour: a palette of the glyph atlas and a brightness level (0..7). */
export interface Shade {
  palette: number;
  tone: number;
}

/**
 * The site's heat ramp, cold to hot: dim grey, grey, white, then the orange of the intro's fire.
 * One accent colour on top of the grey the whole page is made of.
 */
export const HEAT_RAMP: readonly Shade[] = [
  { palette: WHITE, tone: 2 },
  { palette: WHITE, tone: 4 },
  { palette: WHITE, tone: 7 },
  { palette: FIRE, tone: 5 },
  { palette: FIRE, tone: 7 },
];

/** The accent as a CSS colour (the same orange as the FIRE palette). */
export const ACCENT = 'rgb(255 150 50)';

const THRESHOLDS = [0.06, 0.3, 0.5, 0.72, 0.92] as const;

/** Ramp index for a heat level, or -1 when the cell is cold (nothing lit). */
export function heatBucket(level: number): number {
  let bucket = -1;
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (level >= THRESHOLDS[i]!) bucket = i;
  }
  return bucket;
}
