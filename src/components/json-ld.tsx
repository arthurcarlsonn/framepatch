/**
 * Structured data, rendered into the page body.
 *
 * Google reads JSON-LD anywhere in the document, and putting it in the body keeps every
 * builder in src/lib/seo.ts callable from the page that owns the data instead of forcing it
 * up into a layout that cannot see it.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built from the catalogue, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
