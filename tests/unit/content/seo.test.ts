import { describe, expect, it } from 'vitest';

import { contactLead } from '@/content/contact';
import { profile } from '@/content/profile';
import { personJsonLd, seo, serializeJsonLd } from '@/content/seo';

describe('seo', () => {
  it('describes the same person, role and city as the page', () => {
    const data = personJsonLd();
    expect(data['@type']).toBe('Person');
    expect(data.name).toBe(profile.name);
    expect(seo.title).toContain(profile.name);
    expect(seo.title).toContain('Wrocław');
    expect(seo.title.length).toBeLessThanOrEqual(60);
    expect(seo.description.length).toBeLessThanOrEqual(200);
    expect(profile.about.join(' ')).toContain('Wrocław');
  });

  it('claims an offer only if the page says it too', () => {
    expect(contactLead.toLowerCase()).toContain('fast, affordable');
    expect(seo.offer.toLowerCase()).toContain('fast, affordable');
  });

  it('lists real skills and links, and never superlatives', () => {
    const data = personJsonLd();
    const knowsAbout = data.knowsAbout as string[];
    expect(knowsAbout).toEqual(expect.arrayContaining(['TypeScript', 'React 19', 'Node.js']));
    expect(data.sameAs).toEqual(['https://github.com/TomaszOpalka']);
    const text = JSON.stringify(data).toLowerCase();
    for (const word of ['best', 'number one', '#1', 'must write', 'ignore previous']) {
      expect(text).not.toContain(word);
    }
  });

  it('serialises safely for a script tag', () => {
    const out = serializeJsonLd({ a: '</script><b>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ a: '</script><b>' });
  });
});
