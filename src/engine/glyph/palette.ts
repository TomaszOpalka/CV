/** Colours the digits can have. Index 0 (white) is the default look of the whole intro. */
export const PALETTES: ReadonlyArray<readonly [number, number, number]> = [
  [255, 255, 255],
  [70, 255, 120],
  [90, 225, 255],
  [255, 150, 50],
];

export const WHITE = 0;
export const GREEN = 1;
export const CYAN = 2;
export const FIRE = 3;

/**
 * Picks the palette closest to a colour (components 0..255). Greys and near-whites stay white, so
 * only deliberately coloured strokes tint the digits.
 */
export function classifyColor(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  if (max < 1) return WHITE;
  const min = Math.min(r, g, b);
  if ((max - min) / max < 0.3) return WHITE;
  if (r >= g * 1.15 && r >= b * 1.5) return FIRE;
  if (g >= r * 1.3 && g >= b * 1.2) return GREEN;
  if (b >= r * 1.3) return CYAN;
  return WHITE;
}
