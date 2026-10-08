/**
 * The storyboard: acts in order with their length in seconds. Everything in the world is a pure
 * function of the time since the sequence started, so skipping, seeking and tests are trivial.
 */
export const ACT_LENGTHS = {
  engine: 2.0,
  turn: 1.5,
  orbit: 1.5,
  pullback: 1.0,
  drive: 1.8,
  smoke: 1.4,
  fall: 2.0,
  hoop: 3.6,
  reactor: 2.6,
  deathStar: 5.0,
  explosion: 1.4,
  matrix: 3.0,
} as const;

export type ActName = keyof typeof ACT_LENGTHS;
export const ACT_NAMES = Object.keys(ACT_LENGTHS) as ActName[];

function startTimes(): Record<ActName, number> {
  const out = {} as Record<ActName, number>;
  let t = 0;
  for (const name of ACT_NAMES) {
    out[name] = t;
    t += ACT_LENGTHS[name];
  }
  return out;
}

/** Start time (s) of every act. */
export const ACT_START: Readonly<Record<ActName, number>> = startTimes();

/** Length of the whole sequence in seconds. */
export const SEQUENCE_SECONDS = ACT_NAMES.reduce((sum, name) => sum + ACT_LENGTHS[name], 0);

/** The act that is playing at time `t` (clamped to the first / last act). */
export function actAt(t: number): ActName {
  let current: ActName = ACT_NAMES[0]!;
  for (const name of ACT_NAMES) {
    if (t >= ACT_START[name]) current = name;
  }
  return current;
}
