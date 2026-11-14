---
title: "Link previews in Node.js and edge runtimes: six libraries, one benchmark"
published: false
description: "Same-corpus speed, install size and URL-fetching security for linkpeek, unfurl.js, link-preview-js, open-graph-scraper, metascraper and url-metadata."
tags: node, typescript, webdev, security
---

<!--
Draft for dev.to / Hashnode. Publish from the author's account.
- Keep the disclosure line below.
- Numbers come from website/data/benchmarks.json (measured 2026-11-14). Re-run
  benchmarks/competitive and re-check the security notes in docs/comparison.md
  if this is published more than a few weeks later.
- Hashnode: paste without the front matter and set the tags manually.
-->

*Disclosure: I maintain [linkpeek](https://www.npmjs.com/package/linkpeek), one of the six libraries below. Every number in this post comes from an open harness you can run yourself, and it includes the results where linkpeek loses.*

Every chat app, CMS, feed and bookmarking tool eventually needs the same feature: paste a URL, get a card with a title, description and image. The npm packages for this look interchangeable. They are not. They differ in three ways that matter in production:

1. **How much of the page they read.** Metadata lives in `<head>`. Many pages are hundreds of kilobytes of body after it.
2. **What they install.** That matters for serverless cold starts, container images and edge bundles.
3. **Who checks where the request goes.** A preview endpoint turns user input into outbound HTTP requests. That is a server-side request forgery (SSRF) surface.

## The setup

The harness lives in the [linkpeek repository](https://github.com/thegruber/linkpeek/tree/main/benchmarks/competitive). It serves identical HTML fixtures from a local HTTP server in the same Node.js process and calls each library with its defaults, plus only the option it needs to reach `127.0.0.1`. Every timed call must extract the expected title, so a fast wrong answer counts as a failure.

- Machine: Linux x64, 2 vCPU Intel Xeon 2.20 GHz, Node.js 24.22.2
- Versions (latest on npm that day): linkpeek 2.1.7, unfurl.js 6.4.0, link-preview-js 6.0.0, open-graph-scraper 6.13.0, url-metadata 6.3.1, metascraper 5.58.6 with seven rule packages
- Result: median of three runs, each reporting the median of 150 calls (40 for the large page) after 5 warmups

Localhost makes the network almost free, so these numbers isolate library overhead. They do not predict latency against real websites, where the network usually dominates.

Three adapters need a note, and two of them are a good sign. link-preview-js and open-graph-scraper now refuse to fetch private addresses at all, so they cannot reach a localhost benchmark server. Both are measured as native `fetch` plus their HTML-parsing entry points (`getPreviewFromContent()` and `ogs({ html })`). metascraper does not fetch at all, so it is paired with native `fetch`, as its docs pair it with `got`.

## A 500 kB page with a normal head

| Package | Median per preview |
| --- | ---: |
| linkpeek | 2.80 ms |
| unfurl.js | 11.0 ms |
| url-metadata | 47.6 ms |
| link-preview-js | 51.7 ms |
| metascraper | 59.8 ms |
| open-graph-scraper | 384 ms |

This is the case where design matters most. linkpeek parses the response as a stream and cancels it after `</head>`; in a controlled probe it requested 2 kB of the 500 kB body. Libraries that read the whole response before parsing pay for every byte of the body, every time. (metascraper's runs varied between 52 and 95 ms; the others were stable.)

## Small pages (0.6–2.3 kB)

| Package | Mean of three fixture medians |
| --- | ---: |
| unfurl.js | 0.78 ms |
| linkpeek | 1.10 ms |
| link-preview-js | 1.70 ms |
| open-graph-scraper | 1.85 ms |
| metascraper | 2.58 ms |
| url-metadata | 2.77 ms |

unfurl.js wins every small fixture. The gaps are fractions of a millisecond, which a real network round trip will swamp. If your previews come from small pages only, speed is not a reason to pick any of these over another.

## Install footprint

Clean `npm install --ignore-scripts` of each pinned version:

| Package | `node_modules` | Packages installed |
| --- | ---: | ---: |
| linkpeek | 1.3 MB | 7 |
| unfurl.js | 3.2 MB | 16 |
| link-preview-js | 7.9 MB | 18 |
| url-metadata | 10.4 MB | 30 |
| open-graph-scraper | 11.1 MB | 27 |
| metascraper + 7 rules | 81.1 MB | 128 |

metascraper's size buys something real: a rule system with provider-specific packages for richer article metadata. If you need that, the size is the price of the feature.

## The part benchmarks don't show: where requests go

If users can submit URLs, someone will submit `http://169.254.169.254/latest/meta-data/` (the cloud metadata service), `http://localhost:6379`, or a public URL that redirects to one of those. Questions to ask any preview library:

- Does it block private, loopback, link-local and metadata IP ranges by default, including IPv6 forms such as `::ffff:127.0.0.1`?
- Does it validate **every redirect target**, not only the first URL?
- Does it limit how many bytes it reads, so a multi-gigabyte response can't exhaust memory?
- Does it keep your auth headers off cross-origin redirects?

Where things stood on 14 November 2026. This moved fast: two of these libraries shipped major SSRF hardening in the four weeks before I wrote this.

- **link-preview-js 6.0.0** resolves the hostname of the URL and of every redirect hop with `dns.lookup`, rejects private results, and pins the connection to the addresses it checked, which defeats DNS rebinding. This is the strongest default of the six on Node.js. It needs Node's `undici`; the separate mobile entry point skips the check.
- **open-graph-scraper 6.13.0** only requests destinations whose resolved addresses are public, checks redirects before following them, and has no opt-out.
- **linkpeek 2.1.7** blocks private and special-use IP literals (including mapped IPv6, NAT64 and 6to4 forms), validates every redirect hop, caps retained bytes (30 kB by default), and rejects common credential headers. It does **not** resolve hostnames itself, because it runs on any runtime's `fetch`, including Workers and Deno, where DNS isn't exposed. A hostname that resolves to an internal address needs egress policy at the network layer. That is a real gap compared with the two libraries above on Node.js.
- **unfurl.js** is [archived](https://github.com/jacktuck/unfurl), with no release since February 2024. An open [pull request](https://github.com/jacktuck/unfurl/pull/117) describes URLs reaching `node-fetch` without destination validation.
- **metascraper** doesn't fetch, so redirect validation, address policy, timeouts and byte limits are your fetch layer's job.
- **url-metadata** exposes request-filtering agent options; review its defaults against your threat model.

None of this is a security rating. Whatever you pick, rate-limit the endpoint, cache successes but not errors, and render every returned string as untrusted input.

## Which one should you use?

- **Small, fast previews on edge runtimes (Workers, Vercel Edge, Deno, Bun) or for large pages:** linkpeek. That is what I built it for. On a public Node.js endpoint, pair it with egress rules.
- **The strictest built-in SSRF defense on Node.js:** link-preview-js 6.
- **Rich article metadata with provider-specific rules:** metascraper.
- **Finding the first URL inside free text:** link-preview-js.
- **Broad Open Graph scraping with many options on Node.js:** open-graph-scraper, or its lite package if you already own the fetch.
- **unfurl.js:** fast on small pages, but archived. Think twice before using it for new public endpoints.

```ts
import { preview } from "linkpeek";

const card = await preview("https://example.com/article");
if (card.statusCode < 400) {
  console.log(card.title, card.description, card.image);
}
```

Charts, method and raw JSON runs are on the [benchmark page](https://thegruber.github.io/linkpeek/benchmarks/). If you run the harness on other hardware and get a different ordering, I would like to see it: open an issue or a discussion in the repository.
