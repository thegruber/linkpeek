# linkpeek Comparison Notes

Keep linkpeek's positioning narrow and evidence-based.

## Positioning

Use linkpeek when you need:

- server-side or edge-runtime link preview extraction from a known URL
- Open Graph, Twitter Card, JSON-LD, favicon, canonical, media, and oEmbed discovery
- a small TypeScript package with one runtime dependency
- safe defaults for untrusted preview URLs

Do not position linkpeek as:

- a full article extraction framework
- a provider-specific scraper rule ecosystem
- a text-to-first-URL parser
- a fetched oEmbed client
- the fastest metadata scraper

## Tradeoffs

| Package | Good fit | Tradeoff vs linkpeek |
| --- | --- | --- |
| `link-preview-js` | Extracting a preview from a URL or from the first URL in text | Broader text-input API; less focused on edge-runtime and safe-by-default URL fetching |
| `open-graph-scraper` | Node Open Graph/Twitter Card scraping with broader scraper options | Node-oriented and broader than a small preview-card utility |
| `metascraper` | Rule-based metadata extraction with provider-specific packages | More powerful framework; usually more setup and dependency surface |
| `unfurl.js` | Rich Node metadata with fetched oEmbed support | Richer nested output; not focused on small edge-runtime preview extraction |
| `url-metadata` | Broad page metadata extraction | Broader output shape than preview cards |

## Claim Policy

- Use `npm run benchmark` for local parser and package-footprint regression checks.
- Use `npm run benchmark:live` only as a network smoke check.
- Do not make competitive speed claims without a dedicated benchmark harness that uses the same corpus for every package.
- Refresh package metadata with `npm view` before release notes, launch posts, or marketing pages.
