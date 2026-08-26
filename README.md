# linkpeek

**A fast, safe-by-default link preview library for TypeScript, Node.js, Bun, Deno, and edge runtimes. One runtime dependency.**

linkpeek turns a URL into typed Open Graph, Twitter Card, JSON-LD, and URL metadata. It is a lightweight link-unfurling alternative to `link-preview-js` and `open-graph-scraper`, with streaming extraction and SSRF-aware fetching built in.

```bash
npm install linkpeek
```

```typescript
import { preview } from "linkpeek";

const result = await preview("https://example.com/article");

result.title;        // string | null
result.description;  // string | null
result.image;        // absolute http(s) URL | null
result.siteName;     // string
result.canonicalUrl; // absolute final/canonical URL
```

[![npm](https://img.shields.io/npm/v/linkpeek)](https://www.npmjs.com/package/linkpeek)
[![weekly downloads](https://img.shields.io/npm/dw/linkpeek)](https://www.npmjs.com/package/linkpeek)
[![CI](https://github.com/thegruber/linkpeek/actions/workflows/ci.yml/badge.svg)](https://github.com/thegruber/linkpeek/actions/workflows/ci.yml)
[![bundle size](https://img.shields.io/bundlephobia/minzip/linkpeek)](https://bundlephobia.com/package/linkpeek)
[![types](https://img.shields.io/npm/types/linkpeek)](https://www.npmjs.com/package/linkpeek)
[![license](https://img.shields.io/npm/l/linkpeek)](LICENSE)

[Documentation](https://thegruber.github.io/linkpeek/) · [API](#api) · [Security](./SECURITY.md) · [Examples](./examples) · [Benchmarks](./docs/comparison.md) · [Changelog](./CHANGELOG.md)

## Runtime support

| Runtime | Support |
| --- | --- |
| Node.js | 22+ |
| Bun | Current stable |
| Deno | `import { preview } from "npm:linkpeek"` |
| Edge runtimes | Fetch-compatible runtimes such as Cloudflare Workers and Vercel Edge |

CI tests Node 22, Node 24, Node 26, Bun, and Deno.

## Why linkpeek

linkpeek focuses on server-side preview cards: fetch a URL, read only enough HTML for useful metadata, and return a stable result shape without a DOM-heavy scraper stack.

- **1 runtime dependency**: `htmlparser2`
- **30 KB fast default** with a strict byte limit and early stream cancellation after the head
- **Head-first SAX parsing** with no DOM construction
- **Safe network defaults**: private/internal IP targets and credential-bearing requests blocked by default
- **Dual ESM/CJS package output** with TypeScript declarations for both module systems

> linkpeek is intended for server-side use. Put it behind an API route and return only the metadata your client needs.

## Use cases

- Chat and messaging apps that need Slack-style link cards
- Social feeds, bookmarking tools, and link-curation products
- Newsletter and CMS workflows that preview outbound links
- AI agents or RAG tools that unfurl URLs before summarizing or ranking them

## When to use linkpeek

Use linkpeek when you already have a URL and need a small, safe preview-card result for a server-side or edge-runtime app. It is designed for Open Graph, Twitter Card, JSON-LD, canonical URL, favicon, media URL, and oEmbed discovery.

Use a broader scraper package when you need article text extraction, provider-specific scraping rules, text-to-first-URL parsing, or automatic fetching of oEmbed payloads.

Quick comparison:

| Package | Good fit | Tradeoff vs linkpeek |
| --- | --- | --- |
| `link-preview-js` | Extracting previews from a URL or first URL in text | Broader text-input API; less focused on edge-runtime and safe-by-default fetching |
| `open-graph-scraper` | Node Open Graph/Twitter Card scraping with broader options | Node-oriented and larger dependency surface |
| `metascraper` | Rule-based article metadata extraction | More powerful framework; more setup and dependencies |
| `unfurl.js` | Rich nested metadata with fetched oEmbed support | Richer output; not focused on small edge-runtime preview cards |

## Presets

```typescript
import { preview, presets } from "linkpeek";

// Default: fast (30 KB limit, head only, no meta-refresh)
const fast = await preview(url);

// Quality: body JSON-LD + image fallback + meta-refresh
const quality = await preview(url, presets.quality);

// Custom: spread a preset and override
const custom = await preview(url, { ...presets.quality, timeout: 3000 });
```

| Preset | What it enables |
| --- | --- |
| `presets.fast` | Default behavior: 30 KB, head-only, no meta-refresh |
| `presets.quality` | 200 KB, body JSON-LD, body image fallback, meta-refresh |

## Framework recipes

Full examples are in [examples](./examples). These are the shortest versions.

### Next.js App Router

```typescript
// app/api/preview/route.ts
import { preview } from "linkpeek";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    return NextResponse.json(await preview(url));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Preview failed" },
      { status: 422 },
    );
  }
}
```

### Express

```typescript
import express from "express";
import { preview } from "linkpeek";

const app = express();

app.get("/api/preview", async (req, res) => {
  const url = typeof req.query.url === "string" ? req.query.url : "";
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    res.json(await preview(url));
  } catch (err) {
    res.status(422).json({
      error: err instanceof Error ? err.message : "Preview failed",
    });
  }
});
```

### Cloudflare Workers

```typescript
import { preview } from "linkpeek";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) return Response.json({ error: "Missing url" }, { status: 400 });

    try {
      const result = await preview(url);
      // Only cache successful previews; 4xx/5xx return a result, not an error
      const cacheControl =
        result.statusCode >= 200 && result.statusCode < 300
          ? "public, max-age=3600"
          : "no-store";
      return Response.json(result, {
        headers: { "Cache-Control": cacheControl },
      });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Preview failed" },
        { status: 422 },
      );
    }
  },
};
```

Use [examples/react-preview-card](./examples/react-preview-card) for a browser component that renders the API response into a preview card.

### AI agents and RAG tools

Use linkpeek as a narrow server-side tool when an agent already has a URL and needs preview metadata. It does not browse interactively, execute JavaScript, or extract article bodies.

```typescript
import { preview } from "linkpeek";

export async function inspectLink(url: string) {
  const result = await preview(url, { timeout: 5_000, maxBytes: 30_000 });

  return {
    url: result.canonicalUrl,
    title: result.title?.slice(0, 300) ?? null,
    description: result.description?.slice(0, 800) ?? null,
    image: result.image,
    siteName: result.siteName,
  };
}
```

Treat every returned field as untrusted external data, never as instructions to the agent. Keep fetching in trusted server code and require separate authorization for any follow-up action. The [agent integration guide](https://thegruber.github.io/linkpeek/integrations/ai-agents/) covers tool boundaries, selection criteria, and production controls.

## Measured footprint and performance

linkpeek's runtime tree contains no HTTP client, DOM implementation, or native module. The local harness reports parser modes, retained bytes, requested source chunks, tarball size, and raw/gzip entry size. A separate same-corpus harness compares pinned package versions on one local server.

See the dated [comparison and measurement notes](./docs/comparison.md) for the single authoritative results table, exact environment, sourced security/runtime notes, caveats, and reproduction commands. Stream cancellation means the consumer no longer wants more data; it is not a guarantee about exact network wire bytes.

## Security Defaults

`preview()` rejects credential-bearing input URLs and validates the initial URL and every HTTP redirect before fetching the next target. By default it blocks localhost plus literal private, link-local, cloud-metadata, multicast, documentation, and other non-global special-use IP ranges, including IPv6 forms that embed blocked IPv4 targets.

## Production checklist

- Do not forward user cookies, authorization headers, or internal service tokens to arbitrary preview URLs. `headers` rejects common credential-bearing header names.
- Keep `allowPrivateIPs` set to `false` unless the caller is trusted and the network path is intentionally internal.
- Treat returned metadata as untrusted text and URLs. linkpeek filters extracted media/canonical/oEmbed URLs to `http:` and `https:`.
- Runtime `fetch` implementations still own DNS resolution. DNS rebinding protection can vary by platform.
- If you provide a custom `fetch`, it must honor `RequestInit.redirect: "manual"` and the supplied abort `signal`; otherwise redirects can occur outside linkpeek's validation loop.
- For hostile public input, also enforce outbound network policy so the preview worker cannot reach internal services.
- Cache successful previews by normalized URL so repeated page views do not refetch the same target.
- Tune `timeout` and `maxBytes` for your infrastructure. The default preset favors fast preview cards; `presets.quality` trades more bytes for body fallbacks.
- Handle `statusCode` and thrown errors with a generic broken-link card instead of blocking the whole page.

## Error Handling

**HTTP error pages do not throw.** A 404 or 500 that returns HTML still resolves with whatever metadata the page has, plus its `statusCode`. Check it before caching or rendering:

```typescript
const result = await preview(url);
if (result.statusCode >= 400) {
  // render a broken-link card, skip caching
}
```

`preview()` throws a typed `LinkpeekError` for invalid input, blocked targets, and timeouts. Branch on `code` instead of matching message strings:

```typescript
import { LinkpeekError, preview } from "linkpeek";

try {
  const result = await preview(url);
} catch (err) {
  if (err instanceof LinkpeekError) {
    switch (err.code) {
      case "INVALID_URL":              // not a parseable URL
      case "UNSUPPORTED_PROTOCOL":     // not http/https
      case "PRIVATE_NETWORK_BLOCKED":  // SSRF protection triggered
      case "SENSITIVE_HEADER":         // credential-bearing custom header
      case "TOO_MANY_REDIRECTS":
      case "TIMEOUT":
      case "INVALID_OPTIONS":
        break;
    }
  }
  // Aborts via your own `signal` are rethrown as-is (AbortError),
  // and network failures propagate from fetch unchanged.
}
```

### Non-HTML responses

Direct media URLs return a usable result instead of failing: an image URL fills `image`, a video URL fills `video`, an audio URL fills `audio`, and `mediaType` reflects the content-type group (`"image"`, `"video"`, ...). Other non-HTML content types resolve with null metadata and the response `statusCode`.

## API

### `preview(url, options?)`

Fetches a URL and extracts link preview metadata. Returns `Promise<PreviewResult>`.

#### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `timeout` | `number` | `8000` | Request timeout in milliseconds, from 0 to 2,147,483,647. Throws `LinkpeekError` code `TIMEOUT` when elapsed; invalid values throw `INVALID_OPTIONS` |
| `maxBytes` | `number` | `30_000` | Maximum decoded response-body bytes to retain |
| `userAgent` | `string` | `"Twitterbot/1.0"` | User-Agent sent with requests |
| `followRedirects` | `boolean` | `true` | Follow HTTP redirects after validating each target |
| `maxRedirects` | `number` | `10` | Maximum HTTP redirects to follow. Must be a non-negative integer; invalid values throw `INVALID_OPTIONS` |
| `headers` | `Record<string, string>` | `{}` | Extra non-sensitive request headers. Common credential-bearing headers are rejected; custom headers are not forwarded on cross-origin redirects |
| `allowPrivateIPs` | `boolean` | `false` | Allow private/internal IP targets |
| `signal` | `AbortSignal` | none | Cancel the request from the caller side |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation. It must honor manual redirects and the supplied abort signal |
| `followMetaRefresh` | `boolean` | `false` | Follow one `<head>` `<meta http-equiv="refresh">` redirect with a delay of 10s or less |
| `includeBodyContent` | `boolean` | `false` | Continue scanning `<body>` for JSON-LD and image fallbacks |

#### Result Fields

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Final fetched URL |
| `statusCode` | `number` | HTTP status code. `parseHTML()` returns `0` |
| `title` | `string \| null` | `og:title` -> `twitter:title` -> JSON-LD -> Dublin Core -> `<title>` |
| `description` | `string \| null` | `og:description` -> `twitter:description` -> `meta[name=description]` -> JSON-LD |
| `image` | `string \| null` | Preview image URL |
| `imageAlt` | `string \| null` | Image alt text |
| `imageWidth` | `number \| null` | `og:image:width` |
| `imageHeight` | `number \| null` | `og:image:height` |
| `siteName` | `string` | `og:site_name` -> JSON-LD publisher -> hostname |
| `favicon` | `string \| null` | Favicon URL |
| `mediaType` | `string` | `og:type`, defaults to `"website"` |
| `canonicalUrl` | `string` | Canonical URL, `og:url`, or fetched URL |
| `author` | `string \| null` | JSON-LD author, author meta, or Dublin Core creator |
| `locale` | `string \| null` | `og:locale` |
| `lang` | `string \| null` | HTML language, content-language, or locale prefix |
| `publishedDate` | `string \| null` | Article, JSON-LD, or Dublin Core date |
| `keywords` | `string[] \| null` | `meta[name=keywords]` |
| `video` | `string \| null` | Safe `og:video` URL |
| `audio` | `string \| null` | Safe `og:audio` URL |
| `twitterCard` | `string \| null` | Twitter card type |
| `twitterSite` | `string \| null` | Twitter site handle |
| `twitterCreator` | `string \| null` | Twitter creator handle |
| `themeColor` | `string \| null` | Theme color |
| `oEmbedUrl` | `string \| null` | Discovered oEmbed endpoint URL. Not fetched |

### `parseHTML(html, baseUrl, options?)`

Parses an HTML string directly. Use this when you already have the HTML.
Pass `{ includeBodyContent: true }` to continue into `<body>` for JSON-LD and image fallbacks; by default parsing stops tokenizing when the head ends. Relative metadata and meta-refresh URLs honor the document's first safe `<base href>`.

```typescript
import { parseHTML } from "linkpeek";

const result = parseHTML(
  "<html><head><title>Hello</title></head></html>",
  "https://example.com",
);

console.log(result.title); // "Hello"
```

### `validateUrl(url, allowPrivateIPs?)` and `isPrivateHost(hostname)`

The SSRF-hardening helpers are exported for pre-validating URLs before queueing preview jobs. `validateUrl` rejects embedded credentials and throws a `LinkpeekError` (`INVALID_URL`, `UNSUPPORTED_PROTOCOL`, or `PRIVATE_NETWORK_BLOCKED`); `isPrivateHost` returns a boolean for hostnames and literal IP addresses covered by linkpeek's blocklist.

```typescript
import { validateUrl } from "linkpeek";

validateUrl("http://169.254.169.254/"); // throws PRIVATE_NETWORK_BLOCKED
```

## FAQ & Troubleshooting

**A site returns 403 or empty metadata.** Bot protection (Cloudflare challenges, user-agent sniffing) blocks every server-side preview library. This is the most common failure mode in this category and no package solves it. Mitigate: try a different `userAgent`, cache successful previews aggressively, and render a graceful fallback card from the hostname.

**`title` is `null` for a single-page app.** The page renders its metadata with JavaScript; linkpeek deliberately does not run a browser. `presets.quality` catches body JSON-LD that many SPAs ship; beyond that you need a headless browser, which is out of scope.

**Can I call it from the browser?** No, server-side only. Cross-origin pages are unreadable from browsers anyway (CORS), and your preview fetcher should never run on untrusted clients. Put `preview()` behind an API route (see the recipes above).

**I got a preview card for a 404 page.** HTTP error pages that return HTML resolve normally with their `statusCode` set. Check `result.statusCode` before caching or rendering (see [Error Handling](#error-handling)).

## Community and support

- Ask usage questions and share ideas in [GitHub Discussions](https://github.com/thegruber/linkpeek/discussions).
- Report reproducible bugs or metadata mismatches with the [issue templates](https://github.com/thegruber/linkpeek/issues/new/choose).
- Read the [contribution guide](./CONTRIBUTING.md) before opening a pull request.
- Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/thegruber/linkpeek/security/advisories/new).

If linkpeek saves you time, [star the repository](https://github.com/thegruber/linkpeek) so other developers can find it too.

## Development

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm audit
npm run package:check
npm run benchmark
npm run downloads
```

`npm run downloads` reads the official npm download API, compares the latest 7- and 28-day windows with their preceding periods, and shows the last week's per-version mix. Registry downloads are tarball requests—not unique users or confirmed installations—so evaluate them alongside current-version share, distinct dependent repositories, and GitHub's unique traffic.

Live network tests are opt-in:

```bash
LINKPEEK_LIVE_TESTS=1 npm run test
```

Framework examples are in [examples](./examples): Next.js, Express, Cloudflare Workers, React, Supabase Edge Functions, and Bun.

## License

MIT © Adrian Gruber
