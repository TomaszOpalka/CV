/**
 * The geometry of the "thread" of digits that runs down the left margin of the page and ends with an arrow at the
 * e-mail address. Pure functions: no DOM, so the shape is easy to test and to change.
 * Units are CSS pixels in page coordinates (y counts from the top of the document).
 */

/** Distance between two digits along the thread. */
export const SPACING = 13.5;

export interface ThreadAnchors {
  /** Left edge of the content column; the margin is the free space to its left. */
  contentLeft: number;
  /** Where the thread starts (top of the hero, in page y). */
  startY: number;
  /** The e-mail address: its left edge and its vertical centre. */
  emailLeft: number;
  emailY: number;
}

export interface ThreadPath {
  /** Position of every digit, in order from the start to the arrow. */
  x: Float32Array;
  y: Float32Array;
  count: number;
  /** Length of the whole thread along its curve. */
  length: number;
  /** The tip of the arrow (the last point). */
  tipX: number;
  tipY: number;
}

/** Margin narrower than this: the thread would run into the text, so it is not drawn at all. */
export const MIN_MARGIN = 44;

export function hasRoom(anchors: ThreadAnchors): boolean {
  return anchors.contentLeft >= MIN_MARGIN;
}

/** The horizontal position of the thread at page height `y`: a slow sway around the middle of the left margin. */
export function swayX(anchors: ThreadAnchors, y: number): number {
  const middle = anchors.contentLeft * 0.5;
  const amplitude = Math.max(0, Math.min(34, anchors.contentLeft * 0.5 - 18));
  const t = y - anchors.startY;
  return middle + amplitude * (0.75 * Math.sin(t / 150) + 0.25 * Math.sin(t / 61 + 1.3));
}

/**
 * The thread: it comes down the margin swaying, then in the last stretch leans towards the e-mail and runs
 * straight at it, ending 14 px before its first letter.
 */
export function buildPath(anchors: ThreadAnchors): ThreadPath {
  const approach = 280;
  const endY = anchors.emailY;
  const tipX = Math.max(anchors.contentLeft * 0.5, anchors.emailLeft - 14);
  // The last stretch is level, so the arrow points along the thread: about six digits of it.
  const runStart = tipX - Math.max(0, Math.min(80, tipX - 18));
  const lean = (y: number): number => {
    const t = Math.min(1, Math.max(0, (y - (endY - approach)) / approach));
    const eased = t * t * (3 - 2 * t);
    return swayX(anchors, y) * (1 - eased) + runStart * eased;
  };

  // A fine polyline first (every 2 px of height), then a straight run to the tip.
  const fine: Array<[number, number]> = [];
  for (let y = anchors.startY; y <= endY; y += 2) fine.push([lean(y), y]);
  const lastX = fine.length > 0 ? fine[fine.length - 1]![0] : tipX;
  fine.push([lastX, endY]);
  fine.push([tipX, endY]);

  // Resample by arc length so the digits sit evenly along the curve.
  let length = 0;
  const cumulative = [0];
  for (let i = 1; i < fine.length; i++) {
    length += Math.hypot(fine[i]![0] - fine[i - 1]![0], fine[i]![1] - fine[i - 1]![1]);
    cumulative.push(length);
  }
  const count = Math.floor(length / SPACING) + 1;
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  let segment = 1;
  for (let k = 0; k < count; k++) {
    const target = k * SPACING;
    while (segment < fine.length - 1 && cumulative[segment]! < target) segment++;
    const a = fine[segment - 1]!;
    const b = fine[segment]!;
    const span = cumulative[segment]! - cumulative[segment - 1]!;
    const f = span > 0 ? (target - cumulative[segment - 1]!) / span : 0;
    x[k] = a[0] + (b[0] - a[0]) * f;
    y[k] = a[1] + (b[1] - a[1]) * f;
  }
  return { x, y, count, length, tipX: x[count - 1]!, tipY: y[count - 1]! };
}

/**
 * The digit a cell shows when it is `cellsBehind` digits behind the head of the thread: 9 at the head, counting
 * down to 0, and zeros all the way back to the start.
 */
export function countdownDigit(cellsBehind: number): number {
  return Math.max(0, 9 - Math.floor(cellsBehind));
}

/** Brightness (0..7) of a cell `cellsBehind` the head: bright at the head, the faint grey of the big numbers far behind. */
export function threadTone(cellsBehind: number): number {
  if (cellsBehind >= 10) return 0;
  return Math.max(0, Math.round(5 - cellsBehind * 0.5));
}

/** How far along the thread the head is for a scroll position: 0 at the top of the page, the full length at the bottom. */
export function headDistance(scrollY: number, maxScroll: number, length: number): number {
  if (maxScroll <= 0) return 0;
  return Math.min(1, Math.max(0, scrollY / maxScroll)) * length;
}
