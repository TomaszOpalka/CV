import { describe, expect, it } from 'vitest';

import { carTravel, DRIVE_START } from './driving';
import { ACT_LENGTHS, ACT_NAMES, ACT_START, actAt, SEQUENCE_SECONDS } from './timeline';

describe('timeline', () => {
  it('lays the acts end to end', () => {
    let t = 0;
    for (const name of ACT_NAMES) {
      expect(ACT_START[name]).toBeCloseTo(t);
      t += ACT_LENGTHS[name];
    }
    expect(SEQUENCE_SECONDS).toBeCloseTo(t);
  });

  it('follows the storyboard in order', () => {
    expect(ACT_NAMES).toEqual([
      'engine',
      'turn',
      'orbit',
      'pullback',
      'drive',
      'smoke',
      'fall',
      'hoop',
      'reactor',
      'deathStar',
      'explosion',
      'matrix',
    ]);
  });

  it('the V8 runs for about two seconds, as requested', () => {
    expect(ACT_LENGTHS.engine).toBeGreaterThanOrEqual(1.5);
    expect(ACT_LENGTHS.engine).toBeLessThanOrEqual(2.5);
  });

  it('actAt picks the act and clamps outside the range', () => {
    expect(actAt(-1)).toBe('engine');
    expect(actAt(ACT_START.drive + 0.01)).toBe('drive');
    expect(actAt(ACT_START.hoop - 0.001)).toBe('fall');
    expect(actAt(SEQUENCE_SECONDS + 5)).toBe('matrix');
  });
});

describe('car travel', () => {
  it('stands still, then accelerates away', () => {
    expect(carTravel(0)).toBe(0);
    expect(carTravel(DRIVE_START)).toBe(0);
    const a = carTravel(DRIVE_START + 1);
    const b = carTravel(DRIVE_START + 2);
    expect(a).toBeGreaterThan(0);
    expect(b - a).toBeGreaterThan(a); // still speeding up
  });

  it('is far out of the frame by the end of the drive act', () => {
    expect(carTravel(ACT_START.smoke)).toBeGreaterThan(8);
  });
});
