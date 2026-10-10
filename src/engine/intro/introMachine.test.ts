import { describe, expect, it } from 'vitest';

import {
  INTRO_DURATIONS,
  TIMED_STATES,
  isTimedState,
  nextIntroState,
  type IntroEvent,
  type IntroState,
} from './introMachine';

function run(start: IntroState, events: IntroEvent[]): IntroState {
  return events.reduce(nextIntroState, start);
}

describe('nextIntroState', () => {
  it('walks the whole chain boot -> ... -> done in the intended order', () => {
    const visited: IntroState[] = [];
    let state: IntroState = nextIntroState(nextIntroState('boot', 'ready'), 'press');
    visited.push(state);
    while (state !== 'done') {
      state = nextIntroState(state, 'elapsed');
      visited.push(state);
    }
    expect(visited).toEqual(['exploding', 'playing', 'revealing', 'done']);
  });

  it('ignores a press before the intro is ready and during the explosion', () => {
    expect(run('boot', ['press'])).toBe('boot');
    expect(run('idle', ['press', 'press', 'press'])).toBe('exploding');
  });

  it('does not advance on timers while waiting for a click, nor on a stray press mid-sequence', () => {
    expect(run('idle', ['elapsed', 'elapsed'])).toBe('idle');
    expect(run('playing', ['press', 'ready'])).toBe('playing');
  });

  it('can be skipped from every state and stays done afterwards', () => {
    for (const s of ['boot', 'idle', ...TIMED_STATES] as const) {
      expect(nextIntroState(s, 'skip')).toBe('done');
    }
    expect(run('done', ['ready', 'press', 'elapsed'])).toBe('done');
  });

  it('every timed state has a positive duration', () => {
    for (const s of TIMED_STATES) {
      expect(isTimedState(s)).toBe(true);
      expect(INTRO_DURATIONS[s]).toBeGreaterThan(0);
    }
    expect(isTimedState('idle')).toBe(false);
  });

  it('the whole sequence after the click is a proper film, but not endless', () => {
    const total = TIMED_STATES.reduce((sum, s) => sum + INTRO_DURATIONS[s], 0);
    expect(total).toBeGreaterThan(20_000);
    expect(total).toBeLessThan(45_000);
  });
});
