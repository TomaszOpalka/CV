/** Domain types used only by the frontend. API contract types live in @shared/types. */

export interface NavItem {
  id: string;
  label: string;
  href: string;
  /** Emoji shown by the custom cursor while this section is active. */
  emoji: string;
}

export interface PortraitConfig {
  /** Public URL of the photo (see docs/ASSETS.md). */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Vertical focal point of the crop, 0 (top) .. 1 (bottom). */
  focalY: number;
}

export interface Profile {
  name: string;
  role: string;
  /** Short "about me" paragraphs shown next to the portrait. */
  about: string[];
  portrait: PortraitConfig;
}
