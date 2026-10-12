import { GlyphAtlas } from './GlyphAtlas';

/** Brightness levels of every atlas the UI effects (cursor, pixel field) build. */
export const UI_TONE_LEVELS = 8;

/** A digit atlas for the cell size of an effect, in the site's monospace font. */
export function makeAtlas(cellW: number, cellH: number, dpr: number): GlyphAtlas {
  const family =
    getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() ||
    'monospace';
  return new GlyphAtlas(cellW, cellH, dpr, UI_TONE_LEVELS, family);
}

/** Draw one digit with its top-left corner at (x, y) in device pixels (rounded to whole pixels). */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  atlas: GlyphAtlas,
  glyph: number,
  palette: number,
  tone: number,
  x: number,
  y: number,
): void {
  const { glyphW, glyphH, toneLevels } = atlas;
  ctx.drawImage(
    atlas.canvas,
    glyph * glyphW,
    (palette * toneLevels + tone) * glyphH,
    glyphW,
    glyphH,
    Math.round(x),
    Math.round(y),
    glyphW,
    glyphH,
  );
}
