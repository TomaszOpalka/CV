import { describe, expect, it } from 'vitest';

import { classifyColor, CYAN, FIRE, GREEN, PALETTES, RED, WHITE } from './palette';

describe('classifyColor', () => {
  it('keeps whites, greys and black white', () => {
    expect(classifyColor(255, 255, 255)).toBe(WHITE);
    expect(classifyColor(120, 120, 120)).toBe(WHITE);
    expect(classifyColor(0, 0, 0)).toBe(WHITE);
    expect(classifyColor(255, 240, 250)).toBe(WHITE);
  });

  it('recognises the stroke colours used by the scenes, also when dimmed by anti-aliasing', () => {
    for (const k of [1, 0.6, 0.3]) {
      expect(classifyColor(70 * k, 255 * k, 128 * k)).toBe(GREEN);
      expect(classifyColor(90 * k, 225 * k, 255 * k)).toBe(CYAN);
      expect(classifyColor(255 * k, 150 * k, 50 * k)).toBe(FIRE);
      expect(classifyColor(255 * k, 208 * k, 80 * k)).toBe(FIRE);
    }
  });

  it('every index it returns exists in the palette list', () => {
    for (const index of [WHITE, GREEN, CYAN, FIRE, RED]) expect(PALETTES[index]).toBeDefined();
  });
});
