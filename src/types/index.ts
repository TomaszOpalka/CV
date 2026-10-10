/** Domain types used only by the frontend. API contract types live in @shared/types. */

export interface NavItem {
  id: string;
  label: string;
  href: string;
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

/** One block of the home page, in order of appearance (also drives the header). */
export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  /** Human readable period, e.g. "2023 - present". */
  period: string;
  summary: string;
  achievements: string[];
  /** Names of technologies, matching `SkillItem.name`. */
  tech: string[];
}

export interface SkillItem {
  id: string;
  name: string;
  /** Where it was used (company or project). */
  usedAt: string;
  /** Since when, e.g. "2021". */
  since: string;
}

export interface SkillGroup {
  id: string;
  title: string;
  items: SkillItem[];
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  period: string;
  note?: string;
}

export interface PortfolioLink {
  id: string;
  name: string;
  url: string;
  description: string;
}
