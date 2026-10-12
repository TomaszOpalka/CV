/** Lets the pixel field's explosion switch the cursor's drawing off until it is resumed. */
let paused = false;

export function setCursorPaused(next: boolean): void {
  paused = next;
}

export function isCursorPaused(): boolean {
  return paused;
}
