import { ACT_START } from './timeline';

/** The car stands still for a moment, then accelerates along +x. */
export const DRIVE_START = ACT_START.drive + 0.25;
export const CAR_ACCEL = 8;

/** Distance (m) the car has travelled by time `t` (seconds of the sequence). */
export function carTravel(t: number): number {
  const tau = t - DRIVE_START;
  return tau > 0 ? 0.5 * CAR_ACCEL * tau * tau : 0;
}
