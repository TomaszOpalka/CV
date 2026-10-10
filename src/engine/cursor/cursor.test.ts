import { describe, expect, it } from 'vitest';

import { ICONS, iconForSection, isIconName } from './pixelIcons';

describe('pixel icons', () => {
  it('draws every icon on a 13 x 9 grid with at least one lit cell', () => {
    for (const { rows, palette } of Object.values(ICONS)) {
      expect(rows).toHaveLength(9);
      for (const row of rows) expect(row).toMatch(/^[#+.]{13}$/);
      expect(rows.some((row) => row.includes('#'))).toBe(true);
      expect(palette).toBeGreaterThanOrEqual(0);
    }
  });

  it('maps sections and falls back to the heart', () => {
    expect(iconForSection('contact')).toBe('mail');
    expect(iconForSection('pixels')).toBe('heart');
    expect(iconForSection('unknown')).toBe('heart');
    expect(iconForSection(undefined)).toBe('heart');
    expect(isIconName('mail')).toBe(true);
    expect(isIconName('toString')).toBe(false);
  });
});
