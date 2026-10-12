import { describe, expect, it } from 'vitest';

import { GlyphField } from '../glyph/GlyphField';
import { CYAN } from '../glyph/palette';
import { computeGrid, rampFromCoverage } from '../glyph/portrait';
import { CellShader } from './cells';

const GRID = computeGrid(120, 60, 10);
const RAMP = rampFromCoverage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

function setup(): { field: GlyphField; shader: CellShader; palette: Uint8Array } {
  const field = new GlyphField(GRID, 8, () => 0.5);
  return {
    field,
    shader: new CellShader(field.count, () => 0.5),
    palette: new Uint8Array(field.count),
  };
}

describe('CellShader', () => {
  it('switches dark cells off and lights bright ones at the top tone', () => {
    const { field, shader, palette } = setup();
    const lum = new Float32Array(field.count);
    lum[0] = 1;
    shader.shade(field, lum, palette, RAMP, 1 / 60);
    expect(field.tone[0]).toBeCloseTo(7);
    expect(field.tone[1]).toBe(0);
    expect(Math.max(...field.glyph)).toBeLessThanOrEqual(9);
  });

  it('brighter cells never get a dimmer tone', () => {
    const { field, shader, palette } = setup();
    const lum = new Float32Array(field.count);
    for (let i = 0; i < 10; i++) lum[i] = (i + 1) / 10;
    shader.shade(field, lum, palette, RAMP, 1 / 60);
    for (let i = 1; i < 10; i++) expect(field.tone[i]!).toBeGreaterThanOrEqual(field.tone[i - 1]!);
  });

  it('copies the palette of lit cells', () => {
    const { field, shader, palette } = setup();
    const lum = new Float32Array(field.count);
    lum[3] = 0.8;
    palette[3] = CYAN;
    shader.shade(field, lum, palette, RAMP, 1 / 60);
    expect(field.palette[3]).toBe(CYAN);
  });

  it('locked cells keep their exact brightness (the portrait is not contrast-boosted)', () => {
    const { field, shader, palette } = setup();
    const lum = new Float32Array(field.count).fill(0.5);
    const locked = new Uint8Array(field.count);
    locked[1] = 1;
    shader.shade(field, lum, palette, RAMP, 1 / 60, locked);
    expect(field.tone[1]).toBeCloseTo(1 + 6 * 0.5);
    expect(field.tone[0]!).toBeGreaterThan(field.tone[1]!);
  });

  it('cells that go dark fade out when a trail rate is given, and vanish at once without one', () => {
    const { field, shader, palette } = setup();
    const dark = new Float32Array(field.count);
    field.tone.fill(6);
    shader.shade(field, dark, palette, RAMP, 1 / 60, null, 6);
    expect(field.tone[0]!).toBeGreaterThan(4);
    expect(field.tone[0]!).toBeLessThan(6);
    shader.shade(field, dark, palette, RAMP, 1 / 60, null, 0);
    expect(field.tone[0]).toBe(0);
  });
});
