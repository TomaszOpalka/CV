import { describe, expect, it } from 'vitest';

import { waveColor } from './cursorPalette';
import { ICONS, iconForSection, isIconName } from './pixelIcons';

describe('pixel icons', () => {
  it('draws every icon with squares only, at least one lit', () => {
    for (const rows of Object.values(ICONS)) {
      expect(rows.length).toBeGreaterThan(2);
      for (const row of rows) expect(row).toMatch(/^[#.]+$/);
      expect(rows.some((row) => row.includes('#'))).toBe(true);
    }
  });

  it('maps sections and falls back to the heart', () => {
    expect(iconForSection('contact')).toBe('mail');
    expect(iconForSection('unknown')).toBe('heart');
    expect(iconForSection(undefined)).toBe('heart');
    expect(isIconName('mail')).toBe(true);
    expect(isIconName('toString')).toBe(false);
  });
});

describe('waveColor', () => {
  it('cycles through the palette, also for negative phases', () => {
    expect(waveColor('negative', 0)).toBe(waveColor('negative', 4));
    expect(waveColor('negative', 0)).not.toBe(waveColor('negative', 1));
    expect(waveColor('heat', -1)).toBe(waveColor('heat', 4));
  });
});
