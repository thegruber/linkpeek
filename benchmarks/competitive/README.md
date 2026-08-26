# Competitive benchmark

Same-corpus, end-to-end benchmark required by the claim policy in
[docs/comparison.md](../../docs/comparison.md) before any competitive speed
claim. Every package previews identical URLs served by a local HTTP server
(no external network), on the same Node process, with defaults except the
options each package needs to reach `127.0.0.1` (documented in `bench.mjs`).

## Run

```bash
(cd ../.. && npm run build)
npm install
npm run bench
```

## Results (2026-08-26, Node v24.15.0, Apple Silicon, representative median from three runs, ms per preview)

| Package | 0.6–2.3 kB pages | 489 kB page |
| --- | ---: | ---: |
| **linkpeek 2.1.2** | **0.11–0.22** | **0.35** |
| unfurl.js 6.4.0 | 0.08–0.16 | 2.62 |
| link-preview-js 5.0.0 (fetch+parse) | 0.18–0.31 | 17.45 |
| url-metadata 5.10.0 | 0.41–0.62 | 17.35 |
| metascraper 5.56.2 (+7 rules, native fetch) | 0.29–0.40 | 19.16 |
| open-graph-scraper 6.12.0 | 0.32–0.52 | 217.50 |

## Honest reading

- **Small pages:** linkpeek and unfurl.js are tied at the front within noise
  (~0.1–0.2 ms); both stream with htmlparser2. The cheerio/DOM-based packages
  are roughly 1.5–5x slower. Differences this small are dwarfed by real network time.
- **Large pages (where real-world pages live):** linkpeek's 30 KB byte cap and
  head-first early stop make it 7.5x faster than unfurl.js and 50–621x faster
  than the rest. On a real network the gap widens further: linkpeek downloads
  at most `maxBytes` while the others pull the full page.
- **link-preview-js end-to-end could not be measured**: since the
  CVE-2026-43897 fix it rejects IP-literal hosts with no opt-out, so it cannot
  fetch from a local benchmark server at all. The fetch+parse row uses its
  `getPreviewFromContent()` with native fetch.
- unfurl.js's strong small-page numbers come from an unmaintained package
  (last publish 2024-02) with no SSRF protection (unmerged PR #117).

Caveats: localhost networking is near-free, so these numbers isolate
library overhead (parsing, DOM construction, validation) rather than network.
Re-run on your own hardware before citing; update the date when refreshed.
