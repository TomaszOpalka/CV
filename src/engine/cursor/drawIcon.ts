import { drawGlyph } from '../glyph/drawGlyph';
import type { GlyphAtlas } from '../glyph/GlyphAtlas';
import type { PixelIcon } from './pixelIcons';

/** How often the digits of an icon change, in ms. */
export const FLICKER_MS = 110;
/** A dark veil under every lit cell (heavier under the outline), so an icon reads over text. */
const VEIL_OUTLINE = 'rgb(11 11 11 / 80%)';
const VEIL_FILL = 'rgb(11 11 11 / 70%)';

export interface IconDrawOptions {
  /** One digit cell in CSS px. */
  cellW: number;
  cellH: number;
  /** Device pixel ratio the canvas was sized with. */
  scale: number;
  /** Flicker step (`Math.floor(time / FLICKER_MS)`). */
  tick: number;
  /** Brighter outline and a stronger fill, used while the mouse button is down. */
  pressed?: boolean;
}

/**
 * Draws an icon of digits with its top-left corner at (left, top) CSS px. The canvas transform must be the
 * identity (coordinates are scaled to device pixels here). Shared by the mouse cursor and the touch pop-up.
 */
export function drawIconDigits(
  ctx: CanvasRenderingContext2D,
  atlas: GlyphAtlas,
  icon: PixelIcon,
  left: number,
  top: number,
  { cellW, cellH, scale, tick, pressed = false }: IconDrawOptions,
): void {
  const { rows, palette, fillTone = 1 } = icon;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    for (let c = 0; c < row.length; c++) {
      const mark = row[c];
      if (mark === '.') continue;
      ctx.fillStyle = mark === '#' ? VEIL_OUTLINE : VEIL_FILL;
      ctx.fillRect(
        (left + c * cellW) * scale,
        (top + r * cellH) * scale,
        cellW * scale,
        cellH * scale,
      );
    }
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]!;
    for (let c = 0; c < row.length; c++) {
      const mark = row[c];
      if (mark === '.') continue;
      const glyph = (r * 7 + c * 13 + tick * (1 + ((r + c) % 3))) % 10;
      const outline = mark === '#';
      const flicker = (tick + r + c) % 2;
      let tone: number;
      if (pressed) tone = outline ? 7 : 4;
      else tone = outline ? 6 + flicker : fillTone + flicker;
      drawGlyph(
        ctx,
        atlas,
        glyph,
        palette,
        tone,
        (left + c * cellW) * scale,
        (top + r * cellH) * scale,
      );
    }
  }
}
