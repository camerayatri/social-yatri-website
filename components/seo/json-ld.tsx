import { jsonLd } from "@/lib/seo";

/**
 * A block of structured data.
 *
 * A plain `<script>` and not `next/script`: this is data for a crawler, not
 * code for the browser to run, so there is nothing to schedule. Rendered on
 * the server only, so it is in the HTML a crawler fetches before any
 * JavaScript has run.
 */
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}
