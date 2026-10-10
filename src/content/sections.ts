import type { NavItem } from '@/types';

/** The sections of the home page, top to bottom. `id` is also the DOM id and the URL hash. */
export const SECTIONS: readonly NavItem[] = [
  { id: 'about', label: 'About', href: '#about', emoji: '👋' },
  { id: 'pixels', label: 'Other CVs', href: '#pixels', emoji: '💥' },
  { id: 'experience', label: 'Experience', href: '#experience', emoji: '💼' },
  { id: 'stack', label: 'Stack', href: '#stack', emoji: '🛠️' },
  { id: 'education', label: 'Education', href: '#education', emoji: '🎓' },
  { id: 'contact', label: 'Contact', href: '#contact', emoji: '✉️' },
];

export function sectionById(id: string): NavItem {
  const found = SECTIONS.find((section) => section.id === id);
  if (!found) throw new Error(`Unknown section: ${id}`);
  return found;
}
