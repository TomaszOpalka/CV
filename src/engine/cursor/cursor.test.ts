import { describe, expect, it } from 'vitest';

import { waveColor } from './cursorPalette';
import { ICONS, iconForSection, isIconName } from './pixelIcons';
import { PixelTrail } from './PixelTrail';

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

describe('PixelTrail', () => {
  it('lets squares live briefly and then die', () => {
    const trail = new PixelTrail(10, () => 0.5);
    trail.emit(10, 10, 0);
    expect(trail.step(0.1)).toBe(1);
    expect(trail.y[0]!).toBeGreaterThan(10);
    expect(trail.step(2)).toBe(0);
  });

  it('overwrites the oldest square when full', () => {
    const trail = new PixelTrail(3, () => 0.5);
    for (let i = 0; i < 5; i++) trail.emit(i, 0, i);
    expect(trail.phase[0]).toBe(3);
    expect(trail.phase[1]).toBe(4);
    expect(trail.phase[2]).toBe(2);
  });
});
