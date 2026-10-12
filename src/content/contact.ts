import type { ExternalLink } from '@/types';

/** Contact links. The phone number is deliberately not published. */
export const contactLinks: readonly ExternalLink[] = [
  { label: 'to31144@gmail.com', url: 'mailto:to31144@gmail.com' },
  { label: 'github.com/TomaszOpalka', url: 'https://github.com/TomaszOpalka' },
];

/** The sentence above the e-mail address; `seo.ts` may only claim what this says. */
export const contactLead =
  'Looking for a fullstack developer, or a fast, affordable website? Write to me.';
