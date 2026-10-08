import { ACT_START } from './timeline';

export const BALL_RADIUS = 0.18;
export const HOOP_HEIGHT = 3.05;
export const RIM_RADIUS = 0.28;
/** Where the smoke curls into the ball (the world of the car acts). */
export const SMOKE_CENTER = { x: -1.35, y: 0, z: 0.8 } as const;

const GRAVITY = 9.81;
const RESTITUTION = 0.58;
const FALL_ACCEL = 4.45;
/** Speed of the ball when it reaches the hoop's neighbourhood and the speed it has while passing the rim. */
const FALL_END_SPEED = FALL_ACCEL * 2.0;
const HOOP_SPEED = 3.5;
const SLOW_SECONDS = 0.8;
const SLOW_DISTANCE = ((FALL_END_SPEED + HOOP_SPEED) / 2) * SLOW_SECONDS;
const FALL_DISTANCE = 0.5 * FALL_ACCEL * 2.0 * 2.0;
const START_Z = HOOP_HEIGHT + SLOW_DISTANCE + FALL_DISTANCE;

/** Time (s) when the ball passes through the rim. */
export const HOOP_TIME = ACT_START.hoop + SLOW_SECONDS;
/** Time (s) of the first touch of the floor. */
export const FIRST_BOUNCE_TIME =
  HOOP_TIME +
  (-HOOP_SPEED + Math.sqrt(HOOP_SPEED ** 2 + 2 * GRAVITY * (HOOP_HEIGHT - BALL_RADIUS))) / GRAVITY;

/** Lengths of the flight between bounces, after the first touch. */
function bounceTimes(): number[] {
  const impact = Math.sqrt(HOOP_SPEED ** 2 + 2 * GRAVITY * (HOOP_HEIGHT - BALL_RADIUS));
  const out: number[] = [];
  let v = impact * RESTITUTION;
  for (let i = 0; i < 3; i++) {
    out.push((2 * v) / GRAVITY);
    v *= RESTITUTION;
  }
  return out;
}
const BOUNCES = bounceTimes();

/** Ball height (centre) above the floor, in the "arena" world used from the fall on. */
export function ballHeight(t: number): number {
  const fall = ACT_START.fall;
  if (t <= fall) return START_Z;
  const hoop = ACT_START.hoop;
  if (t <= hoop) {
    const tau = t - fall;
    return START_Z - 0.5 * FALL_ACCEL * tau * tau;
  }
  const slowEnd = HOOP_TIME;
  if (t <= slowEnd) {
    const tau = t - hoop;
    const decel = (FALL_END_SPEED - HOOP_SPEED) / SLOW_SECONDS;
    return START_Z - FALL_DISTANCE - (FALL_END_SPEED * tau - 0.5 * decel * tau * tau);
  }
  if (t <= FIRST_BOUNCE_TIME) {
    const tau = t - slowEnd;
    return HOOP_HEIGHT - (HOOP_SPEED * tau + 0.5 * GRAVITY * tau * tau);
  }
  let tau = t - FIRST_BOUNCE_TIME;
  let v = Math.sqrt(HOOP_SPEED ** 2 + 2 * GRAVITY * (HOOP_HEIGHT - BALL_RADIUS)) * RESTITUTION;
  for (const flight of BOUNCES) {
    if (tau <= flight) return BALL_RADIUS + v * tau - 0.5 * GRAVITY * tau * tau;
    tau -= flight;
    v *= RESTITUTION;
  }
  return BALL_RADIUS;
}

/** Sideways roll towards the camera after the first touch (metres). */
export function ballDrift(t: number): number {
  const since = Math.min(1.6, Math.max(0, t - FIRST_BOUNCE_TIME));
  return -0.2 * since;
}

/** Ball centre in the arena (the world used from the fall on). */
export function ballArenaPosition(t: number, out: Float64Array): void {
  out[0] = 0;
  out[1] = ballDrift(t);
  out[2] = ballHeight(t);
}
