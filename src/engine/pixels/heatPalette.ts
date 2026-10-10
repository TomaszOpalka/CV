/** Heat colours from cold to hot (navy, blue, amber, lime, red), as in the pixel field reference. */
export const HEAT_COLORS: readonly string[] = [
  '#232a45',
  '#3f5fe0',
  '#f9c014',
  '#d9ff00',
  '#e8452c',
];

const THRESHOLDS = [0.06, 0.3, 0.5, 0.72, 0.92] as const;

/** Colour index for a heat level, or -1 when the cell is cold (nothing lit). */
export function heatBucket(level: number): number {
  let bucket = -1;
  for (let i = 0; i < THRESHOLDS.length; i++) {
    if (level >= THRESHOLDS[i]!) bucket = i;
  }
  return bucket;
}
