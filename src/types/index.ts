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
export interface ExternalLink {
  label: string;
  url: string;
}

/** One project inside a job, with what was done and the technologies used. */
export interface ProjectItem {
  id: string;
  name: string;
  summary: string;
  achievements: string[];
  tech: string[];
  links?: ExternalLink[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  /** Human readable period, e.g. "2025 - 2026". */
  period?: string;
  summary: string;
  projects: ProjectItem[];
}

export interface SkillItem {
  id: string;
  name: string;
  /** Where it was used, when the CV says so (company or project). */
  usedAt?: string;
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

export interface CertificateItem {
  id: string;
  name: string;
  issuer: string;
  year: string;
}

export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}

export interface PortfolioLink {
  id: string;
  name: string;
  url: string;
  description: string;
}
