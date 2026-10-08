/**
 * State machine of the intro animation. Pure: the controller feeds it events and owns the timing.
 */

export type IntroState = 'boot' | 'idle' | 'exploding' | 'morphing' | 'revealing' | 'done';

export type IntroEvent = 'ready' | 'press' | 'elapsed' | 'skip';

/** How long each timed stage lasts, in milliseconds. */
export const INTRO_DURATIONS = {
  /** Minimum time the boot counter is shown. */
  boot: 900,
  exploding: 650,
  morphing: 1500,
  revealing: 1100,
} as const;

export function nextIntroState(state: IntroState, event: IntroEvent): IntroState {
  if (state === 'done') return 'done';
  if (event === 'skip') return 'done';
  switch (state) {
    case 'boot':
      return event === 'ready' ? 'idle' : state;
    case 'idle':
      return event === 'press' ? 'exploding' : state;
    case 'exploding':
      return event === 'elapsed' ? 'morphing' : state;
    case 'morphing':
      return event === 'elapsed' ? 'revealing' : state;
    case 'revealing':
      return event === 'elapsed' ? 'done' : state;
  }
}
