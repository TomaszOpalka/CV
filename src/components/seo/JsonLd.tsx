import { personJsonLd, serializeJsonLd } from '@/content/seo';

/** Structured data about the author (schema.org Person), in the page body as JSON-LD. */
export function JsonLd() {
  return (
    <script
      type="application/ld+json"
      // The data comes from our own content files and `<` is escaped by serializeJsonLd.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd()) }}
    />
  );
}
