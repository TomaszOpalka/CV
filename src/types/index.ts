/** Domain types used only by the frontend. API contract types live in @shared/types. */

export interface NavItem {
  id: string;
  label: string;
  href: string;
  /** Emoji shown by the custom cursor while this section is active. */
  emoji: string;
}
