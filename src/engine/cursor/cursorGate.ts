/**
 * Lets an effect that needs every bit of the frame (the pixel field's explosion) switch the cursor's drawing
 * off for a moment. The cursor clears its canvas and stays quiet until it is resumed.
 */
let paused = false;

export function setCursorPaused(next: boolean): void {
  paused = next;
}

export function isCursorPaused(): boolean {
  return paused;
}
