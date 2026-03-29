# linkpeek

**Link preview extraction for Node.js, Bun, and Deno. One dependency.**

[![npm](https://img.shields.io/npm/v/linkpeek)](https://www.npmjs.com/package/linkpeek)
[![bundle size](https://img.shields.io/bundlephobia/minzip/linkpeek)](https://bundlephobia.com/package/linkpeek)
[![CI](https://github.com/thegruber/linkpeek/actions/workflows/ci.yml/badge.svg)](https://github.com/thegruber/linkpeek/actions/workflows/ci.yml)
[![types](https://img.shields.io/npm/types/linkpeek)](https://www.npmjs.com/package/linkpeek)
[![license](https://img.shields.io/npm/l/linkpeek)](LICENSE)

<p align="center">
  <img src="./assets/preview.png" alt="linkpeek in action" width="820" />
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

Also works with `bun add linkpeek` and `import { preview } from "npm:linkpeek"` (Deno).

## Why linkpeek

Most link preview libraries depend on Cheerio, build a full DOM, download the entire page, and only run on Node. linkpeek takes a different approach:

- **1 dependency** (htmlparser2) — not 4, not a plugin tree
- **Stops at `</head>`** — streams 30 KB, not the full 2 MB page
- **SAX streaming** — no DOM construction, ~2 ms parse time
- **SSRF protection** — private/internal IPs blocked by default
- **Runs everywhere** — Node.js 20+, Bun, Deno, and edge runtimes (tested in CI)

> **Note:** linkpeek should be used server-side only. Use it in an API route and return the result to the client.

## Presets

```typescript
import { preview, presets } from "linkpeek";

// Default: fast (30 KB limit, head only, no meta-refresh)
const result = await preview(url);

// Quality: body JSON-LD + image fallback + meta-refresh
const result = await preview(url, presets.quality);

// Custom: spread a preset and override
const result = await preview(url, { ...presets.quality, timeout: 3000 });
```

| Preset            | What it enables                             |
| ----------------- | ------------------------------------------- |
| `presets.fast`    | Default behavior — explicit version of `{}` |
| `presets.quality` | Body JSON-LD, image fallback, meta-refresh  |

## Error handling

`preview()` throws for invalid input and blocked URLs:

```typescript
try {
  const result = await preview(url);
} catch (err) {
  // "Invalid URL"
  // "Only http and https URLs are supported"
  // "URLs pointing to private/internal networks are not allowed"
  console.error(err.message);
}
```

## API

### `preview(url, options?)`

Fetches a URL and extracts link preview metadata. Returns `Promise<PreviewResult>`.

#### Options

| Option               | Type                     | Default            | Description                                                                                                                                                 |
| -------------------- | ------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timeout`            | `number`                 | `8000`             | Request timeout in milliseconds                                                                                                                             |
| `maxBytes`           | `number`                 | `30_000`           | Max bytes to stream                                                                                                                                         |
| `userAgent`          | `string`                 | `"Twitterbot/1.0"` | User-Agent sent with requests. Twitterbot gets pre-rendered HTML from most platforms                                                                        |
| `followRedirects`    | `boolean`                | `true`             | Follow HTTP 3xx redirects                                                                                                                                   |
| `headers`            | `Record<string, string>` | `{}`               | Extra request headers (e.g. cookies, auth tokens)                                                                                                           |
| `allowPrivateIPs`    | `boolean`                | `false`            | Allow fetching private/internal IPs. Keep `false` in production to prevent SSRF attacks                                                                     |
| `followMetaRefresh`  | `boolean`                | `false`            | Follow `<meta http-equiv="refresh">` redirects when no title is found. Enable to handle Cloudflare-challenged pages at the cost of an extra HTTP round-trip |
| `includeBodyContent` | `boolean`                | `false`            | Continue scanning `<body>` for JSON-LD scripts and `<img>` fallbacks after `</head>`. Enable together with a higher `maxBytes` for best quality             |

#### Result Fields

| Field            | Type               | Description                                                                                                                                             |
| ---------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `url`            | `string`           | Final resolved URL                                                                                                                                      |
| `statusCode`     | `number`           | HTTP status code (200, 301, 404, etc.). Returns `0` when using `parseHTML()` directly                                                                   |
| `title`          | `string \| null`   | Page title (`og:title` → `twitter:title` → JSON-LD → `<title>`)                                                                                         |
| `description`    | `string \| null`   | Description (`og:description` → `twitter:description` → `meta[name=description]` → JSON-LD)                                                             |
| `image`          | `string \| null`   | Preview image (`og:image` → `twitter:image` → JSON-LD → `itemprop=image` → first `<img>`)                                                               |
| `imageAlt`       | `string \| null`   | Image alt text (`og:image:alt` → `twitter:image:alt`)                                                                                                   |
| `imageWidth`     | `number \| null`   | Image width from `og:image:width`                                                                                                                       |
| `imageHeight`    | `number \| null`   | Image height from `og:image:height`                                                                                                                     |
| `siteName`       | `string`           | Site name (`og:site_name` → JSON-LD publisher → hostname fallback)                                                                                      |
| `favicon`        | `string \| null`   | Favicon URL (largest `apple-touch-icon` → `link[rel=icon]` → `/favicon.ico`)                                                                            |
| `mediaType`      | `string`           | Content type from `og:type`, defaults to `"website"`                                                                                                    |
| `canonicalUrl`   | `string`           | Canonical URL (`link[rel=canonical]` → `og:url` → request URL)                                                                                          |
| `author`         | `string \| null`   | Author name (JSON-LD author → `meta[name=author]` → Dublin Core)                                                                                        |
| `locale`         | `string \| null`   | Locale from `og:locale`                                                                                                                                 |
| `lang`           | `string \| null`   | Language code (`<html lang>` → `<meta http-equiv="content-language">` → `og:locale` prefix)                                                             |
| `publishedDate`  | `string \| null`   | Published date (`article:published_time` → JSON-LD `datePublished` → Dublin Core)                                                                       |
| `keywords`       | `string[] \| null` | Keywords from `meta[name=keywords]`                                                                                                                     |
| `video`          | `string \| null`   | Video URL from `og:video`                                                                                                                               |
| `audio`          | `string \| null`   | Audio URL from `og:audio`                                                                                                                               |
| `twitterCard`    | `string \| null`   | Twitter card type (`summary`, `player`, `summary_large_image`)                                                                                          |
| `twitterSite`    | `string \| null`   | Twitter @handle from `twitter:site`                                                                                                                     |
| `twitterCreator` | `string \| null`   | Author's Twitter @handle from `twitter:creator`                                                                                                         |
| `themeColor`     | `string \| null`   | Theme color from `meta[name=theme-color]`                                                                                                               |
| `oEmbedUrl`      | `string \| null`   | Discovered oEmbed endpoint URL from `<link rel="alternate" type="application/json+oembed">`. Not fetched — returned for the caller to resolve if needed |

### `parseHTML(html, baseUrl, options?)`

Parses an HTML string directly. Use this when you already have the HTML.

```typescript
import { parseHTML } from "linkpeek";

const result = parseHTML(
  "<html><head><title>Hello</title></head></html>",
  "https://example.com",
);
console.log(result.title); // "Hello"
```

**Parameters:**

- `html` (`string`) — The HTML content to parse
- `baseUrl` (`string`) — Base URL for resolving relative URLs
- `options?` (`{ includeBodyContent?: boolean }`) — Pass `{ includeBodyContent: true }` to scan `<body>` for JSON-LD and image fallbacks

Returns `PreviewResult`.

## Examples

Framework examples for [Next.js, Express, Cloudflare Workers, React, Supabase, and Bun](./examples).
