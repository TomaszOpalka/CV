import { describe, expect, it } from 'vitest';

import { QualityGovernor } from './QualityGovernor';

function feed(governor: QualityGovernor, frameMs: number, frames: number): Array<number | null> {
  return Array.from({ length: frames }, () => governor.record(frameMs));
}

describe('QualityGovernor', () => {
  it('ignores the warm-up frames', () => {
    const g = new QualityGovernor({ levels: 3, startLevel: 2, warmup: 20, window: 30 });
    expect(feed(g, 200, 20).every((r) => r === null)).toBe(true);
    expect(g.level).toBe(2);
  });

  it('drops a level when frames are slow', () => {
    const g = new QualityGovernor({ levels: 3, startLevel: 2, warmup: 0, window: 30 });
    const results = feed(g, 33, 30); // ~30 fps
    expect(results[29]).toBe(1);
    expect(g.level).toBe(1);
  });

  it('never goes below level 0', () => {
    const g = new QualityGovernor({ levels: 3, startLevel: 0, warmup: 0, window: 10 });
    feed(g, 100, 100);
    expect(g.level).toBe(0);
  });

  it('only raises the level after several consecutive good windows', () => {
    const g = new QualityGovernor({
      levels: 3,
      startLevel: 0,
      warmup: 0,
      window: 10,
      raiseAfter: 3,
    });
    const first = feed(g, 16, 20);
    expect(first.every((r) => r === null)).toBe(true);
    expect(g.level).toBe(0);
    const third = feed(g, 16, 10);
    expect(third[9]).toBe(1);
  });

  it('a slow window resets the climb', () => {
    const g = new QualityGovernor({
      levels: 3,
      startLevel: 1,
      warmup: 0,
      window: 10,
      raiseAfter: 2,
    });
    feed(g, 16, 10); // good window 1
    feed(g, 50, 10); // slow window -> level drops to 0
    expect(g.level).toBe(0);
    feed(g, 16, 10); // good window 1 again
    expect(g.level).toBe(0);
  });
});
