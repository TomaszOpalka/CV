import type { CursorTheme } from '../cursor/cursorPalette';
import { iconForSection, isIconName, type IconName } from '../cursor/pixelIcons';

export type CursorKind = 'default' | 'link' | 'card' | 'text';

export interface CursorTarget {
  kind: CursorKind;
  /** Pixel icon the cursor shows when it rests or hovers something. */
  icon: IconName;
  /** Colour set: `heat` over the pixel field, `negative` (the intro colours) everywhere else. */
  theme: CursorTheme;
  /** Short text shown next to the cursor ("Details", "since 2021"); empty for none. */
  label: string;
}

const KINDS: readonly CursorKind[] = ['default', 'link', 'card', 'text'];
const INTERACTIVE = 'a[href], button, summary, [role="button"]';
const TEXT_FIELD = 'input, textarea, select';

function isKind(value: string | undefined): value is CursorKind {
  return KINDS.includes(value as CursorKind);
}

/**
 * Decides what the custom cursor shows over `element`. Explicit `data-cursor`, `data-cursor-label` and
 * `data-cursor-icon` attributes win (nearest ancestor first); otherwise native links, buttons and form
 * fields get a sensible kind, the icon follows the enclosing `[data-section]`, and `data-cursor-theme="heat"`
 * switches the colours.
 */
export function resolveCursorTarget(element: Element | null): CursorTarget {
  if (!element) return { kind: 'default', icon: 'heart', theme: 'negative', label: '' };

  const declared = element.closest<HTMLElement>('[data-cursor]')?.dataset.cursor;
  const iconName = element.closest<HTMLElement>('[data-cursor-icon]')?.dataset.cursorIcon;
  const label = element.closest<HTMLElement>('[data-cursor-label]')?.dataset.cursorLabel ?? '';
  const theme = element.closest<HTMLElement>('[data-cursor-theme]')?.dataset.cursorTheme;
  const sectionId = element.closest<HTMLElement>('[data-section]')?.id;

  let kind: CursorKind = 'default';
  if (isKind(declared)) kind = declared;
  else if (element.closest(TEXT_FIELD)) kind = 'text';
  else if (element.closest(INTERACTIVE)) kind = 'link';

  let icon: IconName = isIconName(iconName) ? iconName : iconForSection(sectionId);
  if (!isIconName(iconName)) {
    if (kind === 'link') icon = 'arrow';
    else if (kind === 'text') icon = 'beam';
  }

  return { kind, icon, theme: theme === 'heat' ? 'heat' : 'negative', label };
}

export function sameTarget(a: CursorTarget, b: CursorTarget): boolean {
  return a.kind === b.kind && a.icon === b.icon && a.theme === b.theme && a.label === b.label;
}
