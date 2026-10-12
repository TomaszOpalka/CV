import { personJsonLd, serializeJsonLd } from '@/content/seo';

/** Structured data about the author (schema.org Person), in the page body as JSON-LD. */
export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      // Own content only, and `<` is escaped by serializeJsonLd.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd()) }}
    />
  );
}
