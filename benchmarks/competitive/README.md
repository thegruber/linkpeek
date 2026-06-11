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

## Results (2026-06-11, Node v24.15.0, Apple Silicon, median ms per preview)

| Package | 0.6–2.3 kB pages | 489 kB page |
| --- | ---: | ---: |
| **linkpeek 2.1.0** | **0.11–0.21** | **0.51** |
| unfurl.js 6.4.0 | 0.09–0.17 | 2.38 |
| link-preview-js 4.0.3 (fetch+parse) | 0.26–0.39 | 14.70 |
| url-metadata 5.4.4 | 0.40–0.56 | 15.41 |
| metascraper 5.50.6 (+7 rules, native fetch) | 0.27–0.37 | 18.42 |
| open-graph-scraper 6.11.0 | 0.31–0.52 | 208.45 |

## Honest reading

- **Small pages:** linkpeek and unfurl.js are tied at the front within noise
  (~0.1–0.2 ms); both stream with htmlparser2. The cheerio/DOM-based packages
  are 2–4x slower. Differences this small are dwarfed by real network time.
- **Large pages (where real-world pages live):** linkpeek's 30 KB byte cap and
  head-first early stop make it 4.7x faster than unfurl.js and 29–409x faster
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
