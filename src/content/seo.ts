import { contactLinks } from './contact';
import { education } from './education';
import { profile } from './profile';
import { skillGroups } from './skills';

/** Canonical address of the site (origin, punycode form of tomaszopałka.com). */
export const siteUrl = new URL('https://tomaszopałka.com').origin;

/** Search-engine copy. It must match what the page shows to people: no hidden text or keyword lists. */
export const seo = {
  title: `${profile.name} | Junior Fullstack Developer in Wrocław`,
  description:
    'Junior Fullstack Developer (programista fullstack) in Wrocław: React, Next.js, Node.js, TypeScript and AI tooling. Fast, affordable websites and web applications.',
  jobTitle: 'Junior Fullstack Developer',
  city: 'Wrocław',
  country: 'PL',
  /** The offer, as worded on the page (see `contactLead`). */
  offer: 'Fast, affordable websites and web applications',
} as const;

/** The groups whose skills describe the profile best, in the order of `skills.ts`. */
const KNOWS_ABOUT_GROUPS = ['frontend', 'backend', 'ai', 'databases'];

/** schema.org `Person` for the home page, as a plain object (serialised by `<JsonLd>`). */
export function personJsonLd(): Record<string, unknown> {
  const email = contactLinks.find((link) => link.url.startsWith('mailto:'));
  const github = contactLinks.find((link) => link.url.includes('github.com'));
  const knowsAbout = skillGroups
    .filter((group) => KNOWS_ABOUT_GROUPS.includes(group.id))
    .flatMap((group) => group.items.map((item) => item.name));
  const school = education[0];

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    url: siteUrl,
    alternateName: 'Tomasz Opalka',
    jobTitle: seo.jobTitle,
    description: seo.description,
    address: {
      '@type': 'PostalAddress',
      addressLocality: seo.city,
      addressCountry: seo.country,
    },
    ...(email ? { email: email.url } : {}),
    ...(github ? { sameAs: [github.url] } : {}),
    knowsAbout,
    knowsLanguage: ['pl', 'en', 'de'],
    ...(school ? { affiliation: { '@type': 'EducationalOrganization', name: school.school } } : {}),
    makesOffer: {
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: seo.offer },
    },
  };
}

/** JSON for a `<script type="application/ld+json">`: `<` is escaped so the data can never close the tag. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
