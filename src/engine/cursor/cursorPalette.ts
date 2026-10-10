import { PALETTES } from '../glyph/palette';
import { HEAT_COLORS } from '../pixels/heatPalette';

/** `heat`: over the pixel field (where the field itself lights up). `negative`: the rest of the page. */
export type CursorTheme = 'negative' | 'heat';

const NEGATIVE_COLORS = PALETTES.map(([r, g, b]) => `rgb(${r} ${g} ${b})`);

const THEMES: Readonly<Record<CursorTheme, readonly string[]>> = {
  // The colours of the intro (white, green, cyan, fire) for the icon on the dark page.
  negative: NEGATIVE_COLORS,
  // The pixel field's colours (without the near-black navy), so the icon belongs to it there.
  heat: ['#ffffff', ...HEAT_COLORS.slice(1)],
};

/** Colour of a wave at `phase` (any real number; the integer part picks the colour). */
export function waveColor(theme: CursorTheme, phase: number): string {
  const colors = THEMES[theme];
  const index = Math.floor(phase) % colors.length;
  return colors[index < 0 ? index + colors.length : index]!;
}
