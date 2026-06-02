# linkpeek

**Lightweight, safe-by-default link preview and URL metadata extraction for Node.js, Bun, Deno, and fetch-based edge runtimes. One runtime dependency.**

Use linkpeek as a lightweight `link-preview-js` alternative, modern `open-graph-scraper` alternative, or TypeScript URL unfurl utility when you need Open Graph, Twitter Card, JSON-LD, and URL metadata for preview cards.

[![npm](https://img.shields.io/npm/v/linkpeek)](https://www.npmjs.com/package/linkpeek)
[![bundle size](https://img.shields.io/bundlephobia/minzip/linkpeek)](https://bundlephobia.com/package/linkpeek)
[![CI](https://github.com/thegruber/linkpeek/actions/workflows/ci.yml/badge.svg)](https://github.com/thegruber/linkpeek/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/linkpeek)](https://www.npmjs.com/package/linkpeek)
[![license](https://img.shields.io/npm/l/linkpeek)](LICENSE)

<p align="center">
  <img src="https://raw.githubusercontent.com/thegruber/linkpeek/main/assets/preview.png" alt="linkpeek in action" width="820" />
</p>

```typescript
import { preview } from "linkpeek";

const result = await preview("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

result.title;       // "Rick Astley - Never Gonna Give You Up"
result.image;       // "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
result.siteName;    // "YouTube"
result.favicon;     // "https://www.youtube.com/favicon.ico"
result.description; // "The official video for \"Never Gonna Give You Up\"..."
```

## Install

```bash
npm install linkpeek
```

Runtime support:

| Runtime | Support |
| --- | --- |
| Node.js | 22+ |
| Bun | Current stable |
| Deno | `import { preview } from "npm:linkpeek"` |
| Edge runtimes | Fetch-compatible runtimes such as Cloudflare Workers and Vercel Edge |

CI tests Node 22, Node 24, Node 26, Bun, and Deno.

## Why linkpeek

linkpeek focuses on server-side preview cards: fetch a URL, read only enough HTML for useful metadata, and return a stable result shape without a DOM-heavy scraper stack. It is a small metadata extractor for applications that already have a URL and need a safe preview-card result.

- **1 runtime dependency**: `htmlparser2`
- **Streaming fetch** with a strict byte limit
- **Head-first SAX parsing** with no DOM construction
- **Safe defaults**: private/internal IP targets blocked by default
- **Dual ESM/CJS package output** with TypeScript declarations for both module systems

> linkpeek is intended for server-side use. Put it behind an API route and return only the metadata your client needs.

## When to use linkpeek

Use linkpeek when you already have a URL and need a small, safe preview-card result for a server-side or edge-runtime app. It is designed for Open Graph, Twitter Card, JSON-LD, canonical URL, favicon, media URL, and oEmbed discovery.

Use a broader scraper package when you need article text extraction, provider-specific scraping rules, text-to-first-URL parsing, or automatic fetching of oEmbed payloads.

See [docs/comparison.md](https://github.com/thegruber/linkpeek/blob/main/docs/comparison.md) for short tradeoffs against broader scraper packages.

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

## Security Defaults

`preview()` validates the initial URL and every HTTP redirect before fetching the next target. By default it blocks localhost, private networks, link-local/cloud metadata ranges, multicast/reserved IP ranges, and IPv6 address forms that embed private IPv4 targets.

Keep these rules for production:

- Do not forward user cookies, authorization headers, or internal service tokens to arbitrary preview URLs. `headers` rejects common credential-bearing header names.
- Keep `allowPrivateIPs` set to `false` unless the caller is trusted and the network path is intentionally internal.
- Treat returned metadata as untrusted text and URLs. linkpeek filters extracted media/canonical/oEmbed URLs to `http:` and `https:`.
- Runtime `fetch` implementations still own DNS resolution. DNS rebinding protection can vary by platform.

## Error Handling

`preview()` throws for invalid input and blocked URLs:

```typescript
try {
  const result = await preview(url);
} catch (err) {
  // "Invalid URL"
  // "Only http and https URLs are supported"
  // "URLs pointing to private/internal networks are not allowed"
  // "Too many redirects"
  console.error(err instanceof Error ? err.message : err);
}
```

## API

### `preview(url, options?)`

Fetches a URL and extracts link preview metadata. Returns `Promise<PreviewResult>`.

#### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `timeout` | `number` | `8000` | Request timeout in milliseconds |
| `maxBytes` | `number` | `30_000` | Maximum bytes to stream |
| `userAgent` | `string` | `"Twitterbot/1.0"` | User-Agent sent with requests |
| `followRedirects` | `boolean` | `true` | Follow HTTP redirects after validating each target |
| `headers` | `Record<string, string>` | `{}` | Extra non-sensitive request headers. Common credential-bearing headers are rejected |
| `allowPrivateIPs` | `boolean` | `false` | Allow private/internal IP targets |
| `followMetaRefresh` | `boolean` | `false` | Follow one `<meta http-equiv="refresh">` redirect when no title is found |
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
Pass `{ includeBodyContent: true }` to continue into `<body>` for JSON-LD and image fallbacks; by default it keeps the same head-first behavior as `preview()`.

```typescript
import { parseHTML } from "linkpeek";

const result = parseHTML(
  "<html><head><title>Hello</title></head></html>",
  "https://example.com",
);

console.log(result.title); // "Hello"
```

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
```

Live network tests are opt-in:

```bash
LINKPEEK_LIVE_TESTS=1 npm run test
```

Framework examples are in [examples](./examples): Next.js, Express, Cloudflare Workers, React, Supabase Edge Functions, and Bun.
