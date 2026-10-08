/**
 * State machine of the intro animation. Pure: the controller feeds it events and owns the timing.
 *
 * click -> exploding -> a chain of "blueprint" morphs (engine -> F1 -> reactor -> Death Star -> ball)
 *       -> zooming (the ball flies at the camera) -> impact (camera shake, snap into the portrait)
 *       -> revealing (pixelated photo) -> done
 */

export type IntroState =
  | 'boot'
  | 'idle'
  | 'exploding'
  | 'morphingEngine'
  | 'morphingF1'
  | 'morphingReactor'
  | 'morphingDeathStar'
  | 'morphingBasketball'
  | 'zooming'
  | 'impact'
  | 'revealing'
  | 'done';

export type IntroEvent = 'ready' | 'press' | 'elapsed' | 'skip';

/** The timed stages after the click, in order. Each one advances on `elapsed`. */
export const TIMED_STATES = [
  'exploding',
  'morphingEngine',
  'morphingF1',
  'morphingReactor',
  'morphingDeathStar',
  'morphingBasketball',
  'zooming',
  'impact',
  'revealing',
] as const;

export type TimedState = (typeof TIMED_STATES)[number];

/** How long each stage lasts, in milliseconds (`boot` is the minimum time the counter is shown). */
export const INTRO_DURATIONS: Readonly<Record<'boot' | TimedState, number>> = {
  boot: 900,
  exploding: 650,
  morphingEngine: 2100,
  morphingF1: 2600,
  morphingReactor: 1800,
  morphingDeathStar: 1800,
  morphingBasketball: 1500,
  zooming: 1400,
  impact: 800,
  revealing: 1100,
};

export function isTimedState(state: IntroState): state is TimedState {
  return (TIMED_STATES as readonly string[]).includes(state);
}

export function nextIntroState(state: IntroState, event: IntroEvent): IntroState {
  if (state === 'done') return 'done';
  if (event === 'skip') return 'done';
  if (state === 'boot') return event === 'ready' ? 'idle' : state;
  if (state === 'idle') return event === 'press' ? 'exploding' : state;
  if (event !== 'elapsed') return state;
  const index = TIMED_STATES.indexOf(state as TimedState);
  return TIMED_STATES[index + 1] ?? 'done';
}
