import { describe, expect, it } from 'vitest';

import { nextIntroState, type IntroEvent, type IntroState } from './introMachine';

function run(start: IntroState, events: IntroEvent[]): IntroState {
  return events.reduce(nextIntroState, start);
}

describe('nextIntroState', () => {
  it('walks the happy path boot -> done', () => {
    expect(run('boot', ['ready', 'press', 'elapsed', 'elapsed', 'elapsed'])).toBe('done');
  });

  it('ignores a press before the intro is ready and during the explosion', () => {
    expect(run('boot', ['press'])).toBe('boot');
    expect(run('idle', ['press', 'press', 'press'])).toBe('exploding');
  });

  it('does not advance on timers while waiting for a click', () => {
    expect(run('idle', ['elapsed', 'elapsed'])).toBe('idle');
  });

  it('can be skipped from every state and stays done afterwards', () => {
    for (const s of ['boot', 'idle', 'exploding', 'morphing', 'revealing'] as const) {
      expect(nextIntroState(s, 'skip')).toBe('done');
    }
    expect(run('done', ['ready', 'press', 'elapsed'])).toBe('done');
  });
});
