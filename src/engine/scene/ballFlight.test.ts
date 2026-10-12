import { describe, expect, it } from 'vitest';

import {
  ballArenaPosition,
  ballHeight,
  BALL_RADIUS,
  FIRST_BOUNCE_TIME,
  HOOP_HEIGHT,
  HOOP_TIME,
  IMPACTS,
  impactPulse,
} from './ballFlight';
import { ACT_START } from './timeline';

const STEP = 1 / 240;

describe('ball flight', () => {
  it('never goes under the floor and is continuous', () => {
    let prev = ballHeight(ACT_START.fall);
    for (let t = ACT_START.fall; t <= ACT_START.deathStar; t += STEP) {
      const z = ballHeight(t);
      expect(z).toBeGreaterThanOrEqual(BALL_RADIUS - 1e-9);
      expect(Math.abs(z - prev)).toBeLessThan(0.12);
      prev = z;
    }
  });

  it('passes the rim at hoop height, then touches the floor', () => {
    expect(ballHeight(HOOP_TIME)).toBeCloseTo(HOOP_HEIGHT, 1);
    expect(ballHeight(FIRST_BOUNCE_TIME)).toBeCloseTo(BALL_RADIUS, 2);
    expect(HOOP_TIME).toBeLessThan(FIRST_BOUNCE_TIME);
  });

  it('bounces two or three times, each lower than the one before, and then lies still before the reactor', () => {
    const peaks: number[] = [];
    let prev = ballHeight(FIRST_BOUNCE_TIME);
    let rising = false;
    for (let t = FIRST_BOUNCE_TIME; t < ACT_START.reactor; t += STEP) {
      const z = ballHeight(t);
      if (z > prev) rising = true;
      else if (z < prev && rising) {
        peaks.push(prev);
        rising = false;
      }
      prev = z;
    }
    expect(peaks.length).toBeGreaterThanOrEqual(2);
    expect(peaks.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < peaks.length; i++) expect(peaks[i]!).toBeLessThan(peaks[i - 1]!);
    expect(ballHeight(ACT_START.reactor)).toBeCloseTo(BALL_RADIUS, 3);
  });

  it('falls straight down until the first touch and drifts a little afterwards', () => {
    const out = new Float64Array(3);
    ballArenaPosition(ACT_START.hoop, out);
    expect(out[0]).toBe(0);
    expect(Math.abs(out[1]!)).toBe(0);
    ballArenaPosition(ACT_START.reactor, out);
    expect(out[1]).toBeLessThan(0);
    expect(out[1]).toBeGreaterThan(-1);
  });

  it('knows every touch of the floor: the first fall and up to three bounces, each softer', () => {
    expect(IMPACTS.length).toBeGreaterThanOrEqual(3);
    expect(IMPACTS.length).toBeLessThanOrEqual(4);
    for (let i = 1; i < IMPACTS.length; i++) {
      expect(IMPACTS[i]!.t).toBeGreaterThan(IMPACTS[i - 1]!.t);
      expect(IMPACTS[i]!.strength).toBeLessThan(IMPACTS[i - 1]!.strength);
    }
    for (const impact of IMPACTS) expect(ballHeight(impact.t)).toBeCloseTo(BALL_RADIUS, 1);
  });

  it('the impact pulse jumps at a touch and fades afterwards', () => {
    const first = IMPACTS[0]!;
    expect(impactPulse(first.t - 0.1, 8)).toBe(0);
    expect(impactPulse(first.t, 8)).toBeCloseTo(1);
    expect(impactPulse(first.t + 0.2, 8)).toBeLessThan(0.5);
  });
});
