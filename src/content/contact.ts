import type { ExternalLink } from '@/types';

/** Contact links from the author's CV. The phone number is deliberately not published on the site. */
export const contactLinks: readonly ExternalLink[] = [
  { label: 'to31144@gmail.com', url: 'mailto:to31144@gmail.com' },
  { label: 'github.com/TomaszOpalka', url: 'https://github.com/TomaszOpalka' },
];

/** The sentence above the e-mail address. The structured data (`seo.ts`) may only claim what this and the page say. */
export const contactLead =
  'Looking for a fullstack developer, or a fast, affordable website? Write to me.';
