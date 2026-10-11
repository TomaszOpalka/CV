import { describe, expect, it } from 'vitest';

import { driftPosition } from './driftIcon';

describe('driftPosition', () => {
  it('starts in the top-left and ends in the bottom-right of the screen', () => {
    const start = driftPosition(0, 1600, 900, 78, 90);
    const end = driftPosition(1, 1600, 900, 78, 90);
    expect(start.x).toBeLessThan(80);
    expect(start.y).toBeLessThan(200);
    expect(end.x).toBeGreaterThan(1600 - 78 - 80);
    expect(end.y).toBeGreaterThan(900 - 90 - 220);
    expect(end.y + 90).toBeLessThan(900 - 80); // above the footer line
  });

  it('moves right and down as the page scrolls (apart from a small sway)', () => {
    let lastY = -Infinity;
    for (let i = 0; i <= 10; i++) {
      const { y } = driftPosition(i / 10, 1600, 900, 78, 90);
      expect(y).toBeGreaterThan(lastY);
      lastY = y;
    }
  });

  it('stays on screen for any progress and clamps it', () => {
    for (const p of [-1, 0, 0.37, 1, 4]) {
      const { x, y } = driftPosition(p, 1200, 700, 78, 90);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(1200 - 78 + 20);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(700);
    }
  });
});
