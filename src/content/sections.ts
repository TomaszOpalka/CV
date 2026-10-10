import type { NavItem } from '@/types';

/** The sections of the home page, top to bottom. `id` is also the DOM id and the URL hash. */
export const SECTIONS: readonly NavItem[] = [
  { id: 'about', label: 'About', href: '#about' },
  { id: 'pixels', label: 'Other CVs', href: '#pixels' },
  { id: 'experience', label: 'Experience', href: '#experience' },
  { id: 'stack', label: 'Stack', href: '#stack' },
  { id: 'education', label: 'Education', href: '#education' },
  { id: 'contact', label: 'Contact', href: '#contact' },
];
