export type CursorKind = 'default' | 'link' | 'card' | 'text';

export interface CursorTarget {
  kind: CursorKind;
  emoji: string;
  /** Short text shown next to the emoji ("Details", "since 2021"); empty for none. */
  label: string;
}

export const DEFAULT_EMOJI = '✨';

const KINDS: readonly CursorKind[] = ['default', 'link', 'card', 'text'];
const INTERACTIVE = 'a[href], button, summary, [role="button"]';
const TEXT_FIELD = 'input, textarea, select';

function isKind(value: string | undefined): value is CursorKind {
  return KINDS.includes(value as CursorKind);
}

/**
 * Decides what the custom cursor shows over `element`. Explicit `data-cursor`, `data-cursor-label` and
 * `data-cursor-emoji` attributes win (nearest ancestor first); otherwise native links, buttons and
 * form fields get a sensible kind, and the emoji falls back to the one of the section (`data-emoji`).
 */
export function resolveCursorTarget(element: Element | null): CursorTarget {
  if (!element) return { kind: 'default', emoji: DEFAULT_EMOJI, label: '' };

  const marked = element.closest<HTMLElement>('[data-cursor]');
  const labelled = element.closest<HTMLElement>('[data-cursor-label]');
  const emojiHost = element.closest<HTMLElement>('[data-cursor-emoji]');
  const section = element.closest<HTMLElement>('[data-emoji]');

  let kind: CursorKind = 'default';
  const declared = marked?.dataset.cursor;
  if (isKind(declared)) kind = declared;
  else if (element.closest(TEXT_FIELD)) kind = 'text';
  else if (element.closest(INTERACTIVE)) kind = 'link';

  return {
    kind,
    emoji: emojiHost?.dataset.cursorEmoji ?? section?.dataset.emoji ?? DEFAULT_EMOJI,
    label: labelled?.dataset.cursorLabel ?? '',
  };
}

export function sameTarget(a: CursorTarget, b: CursorTarget): boolean {
  return a.kind === b.kind && a.emoji === b.emoji && a.label === b.label;
}
