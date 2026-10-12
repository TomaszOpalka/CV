import { describe, expect, it } from 'vitest';

import {
  buildPath,
  countdownDigit,
  hasRoom,
  headDistance,
  SPACING,
  swayX,
  threadTone,
  type ThreadAnchors,
} from './threadPath';

const anchors: ThreadAnchors = { contentLeft: 120, startY: 140, emailLeft: 120, emailY: 5200 };

describe('buildPath', () => {
  const path = buildPath(anchors);

  it('starts at the top of the hero and ends just before the e-mail, at its height', () => {
    expect(path.y[0]).toBeCloseTo(anchors.startY, 0);
    expect(path.tipY).toBeCloseTo(anchors.emailY, 0);
    expect(path.tipX).toBeLessThan(anchors.emailLeft);
    expect(path.tipX).toBeGreaterThan(anchors.emailLeft - 30);
  });

  it('keeps the digits evenly spaced and in the left margin', () => {
    for (let i = 1; i < path.count; i++) {
      const gap = Math.hypot(path.x[i]! - path.x[i - 1]!, path.y[i]! - path.y[i - 1]!);
      expect(gap).toBeGreaterThan(SPACING * 0.5);
      expect(gap).toBeLessThanOrEqual(SPACING + 0.01);
    }
    for (let i = 0; i < path.count; i++) {
      expect(path.x[i]!).toBeGreaterThan(4);
      expect(path.x[i]!).toBeLessThan(anchors.contentLeft);
    }
  });

  it('goes down the page (never back up) and its length matches the digit count', () => {
    for (let i = 1; i < path.count; i++)
      expect(path.y[i]!).toBeGreaterThanOrEqual(path.y[i - 1]! - 0.01);
    expect(path.count).toBe(Math.floor(path.length / SPACING) + 1);
  });
});

describe('swayX', () => {
  it('stays inside the margin', () => {
    for (let y = 0; y < 6000; y += 37) {
      const x = swayX(anchors, y);
      expect(x).toBeGreaterThan(8);
      expect(x).toBeLessThan(anchors.contentLeft - 8);
    }
  });
});

describe('hasRoom', () => {
  it('needs a margin of 44 px or more', () => {
    expect(hasRoom({ ...anchors, contentLeft: 43 })).toBe(false);
    expect(hasRoom({ ...anchors, contentLeft: 44 })).toBe(true);
  });
});

describe('countdown', () => {
  it('shows 9 at the head, counts down to 0 and leaves zeros behind', () => {
    expect([0, 0.9, 1, 4, 8.5, 9, 10, 400].map(countdownDigit)).toEqual([9, 9, 8, 5, 1, 0, 0, 0]);
  });

  it('is bright at the head and fades to the faintest tone', () => {
    expect(threadTone(0)).toBeGreaterThan(threadTone(6));
    expect(threadTone(10)).toBe(0);
    expect(threadTone(500)).toBe(0);
  });
});

describe('headDistance', () => {
  it('follows the scroll like a progress bar, and goes back when scrolling up', () => {
    expect(headDistance(0, 4000, 5000)).toBe(0);
    expect(headDistance(2000, 4000, 5000)).toBe(2500);
    expect(headDistance(4000, 4000, 5000)).toBe(5000);
    expect(headDistance(1000, 4000, 5000)).toBeLessThan(headDistance(2000, 4000, 5000));
    expect(headDistance(-5, 4000, 5000)).toBe(0);
    expect(headDistance(10, 0, 5000)).toBe(0);
  });
});
