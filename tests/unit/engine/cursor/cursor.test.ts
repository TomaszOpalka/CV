import { describe, expect, it } from 'vitest';

import { ICONS, iconForSection, isIconName } from '@/engine/cursor/pixelIcons';

describe('pixel icons', () => {
  it('draws every icon on a 13 x 9 grid with at least one lit cell', () => {
    for (const { rows, palette } of Object.values(ICONS)) {
      expect(rows).toHaveLength(9);
      for (const row of rows) expect(row).toMatch(/^[#+.]{13}$/);
      expect(rows.some((row) => row.includes('#'))).toBe(true);
      expect(palette).toBeGreaterThanOrEqual(0);
    }
  });

  it('puts the tip of the arrow on the hotspot, so the tip is where you click', () => {
    const { rows, hotspot } = ICONS.arrow;
    expect(hotspot).toEqual({ x: 0, y: 0 });
    expect(rows[0]![0]).toBe('#');
  });

  it('maps sections and falls back to the heart', () => {
    expect(iconForSection('contact')).toBe('mail');
    expect(iconForSection('portfolio')).toBe('heart');
    expect(iconForSection('unknown')).toBe('heart');
    expect(iconForSection(undefined)).toBe('heart');
    expect(isIconName('mail')).toBe(true);
    expect(isIconName('toString')).toBe(false);
  });
});
