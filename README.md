<p align="center">
  <a href="https://thegruber.github.io/linkpeek/"><img src="https://raw.githubusercontent.com/thegruber/linkpeek/main/assets/brand/mark-256.png" width="88" height="88" alt=""></a>
</p>

<h1 align="center">linkpeek</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/linkpeek"><img src="https://img.shields.io/npm/v/linkpeek" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/linkpeek"><img src="https://img.shields.io/npm/dw/linkpeek" alt="npm downloads"></a>
  <a href="https://github.com/thegruber/linkpeek/actions/workflows/ci.yml"><img src="https://github.com/thegruber/linkpeek/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://packagephobia.com/result?p=linkpeek"><img src="https://packagephobia.com/badge?p=linkpeek" alt="install size"></a>
</p>

<p align="center"><a href="https://thegruber.github.io/linkpeek/">Website</a> · <a href="https://thegruber.github.io/linkpeek/quick-start/">Quick start</a> · <a href="https://thegruber.github.io/linkpeek/api/">API</a> · <a href="https://thegruber.github.io/linkpeek/benchmarks/">Benchmarks</a> · <a href="https://thegruber.github.io/linkpeek/security/">Security</a> · <a href="https://github.com/thegruber/linkpeek/tree/main/examples">Examples</a> · <a href="https://github.com/thegruber/linkpeek/blob/main/CHANGELOG.md">Changelog</a></p>

**A fast, safe-by-default link preview library for TypeScript, Node.js, Bun, Deno, and edge runtimes. One runtime dependency.**

linkpeek turns a URL into typed Open Graph, Twitter Card, JSON-LD, and URL metadata. It is a lightweight link-unfurling alternative to `link-preview-js` and `open-graph-scraper`, with streaming extraction and SSRF-aware fetching built in. Requires **Node.js 22.12+**; see the [runtime support](#runtime-support) table for other environments.

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

<p align="center"><a href="https://thegruber.github.io/linkpeek/"><img src="https://raw.githubusercontent.com/thegruber/linkpeek/main/assets/brand/readme-hero.png" alt="Calling preview(url) in TypeScript returns a typed result and a link preview card; measured 3.9 times faster than the next package on a 500 kB page, a 2.4 times smaller install, one runtime dependency, and at most 30 kB kept by default (benchmarks measured 14 November 2026)." width="800"></a></p>

Guides: [Next.js](https://thegruber.github.io/linkpeek/integrations/nextjs/) · [Cloudflare Workers](https://thegruber.github.io/linkpeek/integrations/cloudflare-workers/) · [Express](https://thegruber.github.io/linkpeek/integrations/node-express/) · [AI agents](https://thegruber.github.io/linkpeek/integrations/ai-agents/) · [All libraries compared](https://thegruber.github.io/linkpeek/guides/link-preview-library-comparison/)

Using a coding agent? Paste the [agent task](https://thegruber.github.io/linkpeek/prompt.md) into Claude Code, Cursor, Codex or Copilot and it adds the endpoint and card for you.

## Runtime support

| Runtime | Support |
| --- | --- |
| Node.js | 22.12+ (ESM and CommonJS) |
| Bun | Current stable |
| Deno | `import { preview } from "npm:linkpeek"` |
| Edge runtimes | Fetch-compatible runtimes such as Cloudflare Workers and Vercel Edge |

CI tests Node 22, Node 24, Node 26, Bun, and Deno.

## Why linkpeek

linkpeek focuses on server-side preview cards: fetch a URL, read only enough HTML for useful metadata, and return a stable result shape without a DOM-heavy scraper stack.

- **3.9× faster than the next package** on a 500 kB page, with a 2.4× smaller install ([benchmarks](#benchmarks))
- **1 runtime dependency**: `htmlparser2`
- **30 KB fast default** with a strict byte limit and early stream cancellation after the head
- **Head-first SAX parsing** with no DOM construction, HTTP client or native module
- **Safe network defaults**: literal private/internal IP targets and credential-bearing requests are blocked, and every redirect is checked; DNS resolution stays with the runtime's fetch ([limits](https://thegruber.github.io/linkpeek/security/))
- **Dual ESM/CJS package output** with TypeScript declarations for both module systems

> Call `preview()` on a server or at the edge: browsers may not read other sites' pages (CORS), which is why Slack, Discord and X build previews on a server too. Put it behind an API route and return only the metadata your client needs. `parseHTML()` also runs in the browser.

## Benchmarks

Same-corpus benchmark against five other preview packages, measured on 15 November 2026 from the current source (Linux x64, Node.js 24.22, median of three runs, local server, so library overhead only):

| Package | 500 kB page | Small pages (0.6–2.3 kB) | Clean install |
| --- | ---: | ---: | ---: |
| **linkpeek** | **2.63 ms** | 1.17 ms | **1.3 MB, 7 packages** |
| unfurl.js 6.4.0 | 11.1 ms | 0.79 ms | 3.2 MB, 16 packages |
| link-preview-js 6.0.0 | 48.4 ms | 1.64 ms | 7.9 MB, 18 packages |
| metascraper 5.58.6 (+7 rules) | 65.9 ms | 2.54 ms | 81.1 MB, 128 packages |
| url-metadata 6.3.1 | 68.8 ms | 2.80 ms | 10.4 MB, 30 packages |
| open-graph-scraper 6.13.0 | 395 ms | 1.89 ms | 11.1 MB, 27 packages |

On large pages linkpeek stops after `</head>` and cancels the stream. On small pages the differences are fractions of a millisecond, and `unfurl.js` was faster in this run. Charts, method and raw runs: [benchmarks](https://thegruber.github.io/linkpeek/benchmarks/). Every dated result and the reproduction commands are in the [comparison notes](https://github.com/thegruber/linkpeek/blob/main/docs/comparison.md).

## Use cases

- Chat and messaging apps that need Slack-style link cards
- Social feeds, bookmarking tools, and link-curation products
- Newsletter and CMS workflows that preview outbound links
- Chat assistants that show titles, descriptions, and images for links they already have

## When to use linkpeek

Use linkpeek when you already have a URL and need a small, safe preview-card result for a server-side or edge-runtime app. It is designed for Open Graph, Twitter Card, JSON-LD, canonical URL, favicon, media URL, and oEmbed discovery.

Use a broader scraper package when you need article text extraction, provider-specific scraping rules, text-to-first-URL parsing, or automatic fetching of oEmbed payloads.

Quick comparison:

| Package | Good fit | Tradeoff vs linkpeek |
| --- | --- | --- |
| `link-preview-js` | Extracting previews from a URL or first URL in text | Broader text-input API; Node.js fetch path with DNS pinning, larger install |
| `open-graph-scraper` | Node Open Graph/Twitter Card scraping with broader options | Node-oriented and larger dependency surface |
| `metascraper` | Rule-based article metadata extraction | More powerful framework; more setup and dependencies |
| `unfurl.js` | Rich nested metadata with fetched oEmbed support | Richer output; not focused on small edge-runtime preview cards |

Side-by-side numbers and migration code: [linkpeek vs link-preview-js](https://thegruber.github.io/linkpeek/guides/link-preview-js-alternative/) · [linkpeek vs open-graph-scraper](https://thegruber.github.io/linkpeek/guides/open-graph-scraper-alternative/)

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

Full examples are in [examples](https://github.com/thegruber/linkpeek/tree/main/examples). These are the shortest versions.

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

Use [examples/react-preview-card](https://github.com/thegruber/linkpeek/tree/main/examples/react-preview-card) for a browser component that renders the API response into a preview card.

### Link metadata in agent tools

An agent application can wrap `preview()` in a server-side tool to label links or display source cards. The example below is a framework-neutral helper, not a complete agent integration or MCP server. linkpeek does not browse interactively, execute JavaScript, or extract article bodies. Metadata is supplied by the target site; it is not enough to summarize an article or verify its claims.

```typescript
import { preview } from "linkpeek";

export async function inspectLink(url: string) {
  const result = await preview(url, { timeout: 5_000, maxBytes: 30_000 });

  return {
    statusCode: result.statusCode,
    url: result.canonicalUrl,
    title: result.title?.slice(0, 300) ?? null,
    description: result.description?.slice(0, 800) ?? null,
    image: result.image,
    siteName: result.siteName,
  };
}
```

Treat every returned field as untrusted external data, never as instructions to the agent. Keep fetching in trusted server code and require separate authorization for any follow-up action. The [agent integration guide](https://thegruber.github.io/linkpeek/integrations/ai-agents/) covers tool registration, HTTP errors, untrusted metadata, and production controls.

## Security Defaults

`preview()` rejects credential-bearing input URLs and validates the initial URL and every HTTP redirect before fetching the next target. By default it blocks localhost plus literal private, link-local, cloud-metadata, multicast, documentation, and other non-global special-use IP ranges in any IPv4 spelling (`127.1`, `0x7f000001`, `2130706433`), including IPv6 forms that embed blocked IPv4 targets, and internal names such as `*.internal`, `*.local`, `*.localdomain`, `*.home.arpa` and single-label hosts like `metadata`.

## Production checklist

- Do not forward user cookies, authorization headers, or internal service tokens to arbitrary preview URLs. `headers` rejects common credential-bearing header names.
- Keep `allowPrivateIPs` set to `false` unless the caller is trusted and the network path is intentionally internal.
- Treat returned metadata as untrusted text and URLs. linkpeek filters extracted media/canonical/oEmbed URLs to `http:` and `https:`.
- Runtime `fetch` implementations still own DNS resolution. On Node.js, pass `resolveHost` so every hop's DNS answers are checked for private addresses:

  ```typescript
  import { lookup } from "node:dns/promises";

  await preview(url, {
    resolveHost: async (host) =>
      (await lookup(host, { all: true })).map((entry) => entry.address),
  });
  ```

  fetch still resolves the name again, so this narrows DNS rebinding rather than pinning the address.
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

`preview()` throws a typed `LinkpeekError` for invalid input, blocked targets, timeouts and network failures. Branch on `code` instead of matching message strings:

```typescript
import { LinkpeekError, preview } from "linkpeek";

try {
  const result = await preview(url);
} catch (err) {
  if (err instanceof LinkpeekError) {
    switch (err.code) {
      case "INVALID_URL":              // not a parseable URL
      case "UNSUPPORTED_PROTOCOL":     // not http/https
      case "PRIVATE_NETWORK_BLOCKED":  // private or non-global IP target blocked
      case "SENSITIVE_HEADER":         // credential-bearing custom header
      case "TOO_MANY_REDIRECTS":
      case "TIMEOUT":                  // whole-call deadline elapsed
      case "FETCH_FAILED":             // DNS/TCP/TLS failure; see err.cause
      case "INVALID_OPTIONS":
        break;
    }
  }
  // Aborts via your own `signal` are rethrown as-is (AbortError).
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
| `timeout` | `number` | `8000` | Deadline in milliseconds for the whole call (redirects, body read and any meta-refresh hop), from 0 to 2,147,483,647. Throws `LinkpeekError` code `TIMEOUT` when elapsed; invalid values throw `INVALID_OPTIONS` |
| `maxBytes` | `number` | `30_000` | Maximum decoded response-body bytes to retain. `result.truncated` reports when the limit cut the head |
| `userAgent` | `string` | `"Twitterbot/1.0"` | User-Agent sent with requests |
| `followRedirects` | `boolean` | `true` | Follow HTTP redirects after validating each target |
| `maxRedirects` | `number` | `10` | Maximum redirects per call, HTTP and meta refresh combined. Must be a non-negative integer; invalid values throw `INVALID_OPTIONS` |
| `headers` | `Record<string, string>` | `{}` | Extra non-sensitive request headers. Common credential-bearing headers are rejected; custom headers are not forwarded on cross-origin redirects |
| `allowPrivateIPs` | `boolean` | `false` | Allow private/internal IP targets |
| `resolveHost` | `(hostname) => Promise<string[]>` | none | Opt-in DNS check on the first request and every redirect hop; any private answer throws `PRIVATE_NETWORK_BLOCKED` |
| `signal` | `AbortSignal` | none | Cancel the request from the caller side |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation. It must honor manual redirects and the supplied abort signal; a `response.url` it reports is validated too |
| `followMetaRefresh` | `boolean` | `false` | Follow one `<head>` `<meta http-equiv="refresh">` redirect with a delay of 10s or less |
| `includeBodyContent` | `boolean` | `false` | Continue scanning `<body>` for JSON-LD and image fallbacks |

#### Result Fields

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Final fetched URL; `parseHTML()` returns the canonical URL |
| `statusCode` | `number` | HTTP status code. `parseHTML()` returns `0` |
| `title` | `string \| null` | `og:title` -> `twitter:title` -> Dublin Core -> `<title>` -> JSON-LD headline/name of the page's main entity |
| `description` | `string \| null` | `og:description` -> `twitter:description` -> `meta[name=description]` -> JSON-LD -> Dublin Core |
| `image` | `string \| null` | Preview image URL |
| `imageAlt` | `string \| null` | Image alt text |
| `imageWidth` | `number \| null` | `og:image:width` |
| `imageHeight` | `number \| null` | `og:image:height` |
| `siteName` | `string` | `og:site_name` -> JSON-LD publisher -> JSON-LD `WebSite` name -> hostname |
| `favicon` | `string \| null` | Declared favicon, or the origin’s `/favicon.ico` as a fallback guess |
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
| `truncated` | `boolean` | `maxBytes` cut the response before the end of `<head>` (or the document, with `includeBodyContent`). `parseHTML()` returns `false` |

Text fields are trimmed with whitespace collapsed, and blank values count as missing. JSON-LD fields come from a single entity (the page's article, product or similar), never from a site-wide `Organization` or `WebSite` block.

### `parseHTML(html, baseUrl, options?)`

Parses an HTML string directly. Use this when you already have the HTML. `baseUrl` must be an absolute `http:` or `https:` URL; anything else throws `LinkpeekError` with code `INVALID_URL`.
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

The SSRF-hardening helpers are exported for pre-validating URLs before queueing preview jobs. `validateUrl` rejects embedded credentials and throws a `LinkpeekError` (`INVALID_URL`, `UNSUPPORTED_PROTOCOL`, or `PRIVATE_NETWORK_BLOCKED`); `isPrivateHost` returns a boolean for hostnames and literal IP addresses covered by linkpeek's blocklist, normalising the host the way `fetch()` does first (so `2130706433` and `127.1` count as loopback).

```typescript
import { validateUrl } from "linkpeek";

validateUrl("http://169.254.169.254/"); // throws PRIVATE_NETWORK_BLOCKED
```

## FAQ & Troubleshooting

**A site returns 403 or empty metadata.** Bot challenges, user-agent policies, rate limits, or access restrictions can block server-side fetching. linkpeek does not execute browser challenges. Respect the target’s access policy, use an appropriate `userAgent`, cache successful previews, and render a hostname fallback. See the [troubleshooting guide](https://thegruber.github.io/linkpeek/guides/troubleshooting/).

**`title` is `null` for a single-page app.** The page renders its metadata with JavaScript; linkpeek deliberately does not run a browser. `presets.quality` catches body JSON-LD that many SPAs ship; beyond that you need a headless browser, which is out of scope.

**Can I call it from the browser?** Run `preview()` behind a server or edge endpoint; browser CORS restrictions prevent arbitrary page retrieval. `parseHTML()` makes no network requests and can parse HTML strings locally, including in a browser bundle. The [interactive parser](https://thegruber.github.io/linkpeek/guides/open-graph-parser/#try-title) demonstrates this distinction.

**I got a preview card for a 404 page.** HTTP error pages that return HTML resolve normally with their `statusCode` set. Check `result.statusCode` before caching or rendering (see [Error Handling](#error-handling)).

## Community and support

- Ask usage questions and share ideas in [GitHub Discussions](https://github.com/thegruber/linkpeek/discussions).
- Report reproducible bugs or metadata mismatches with the [issue templates](https://github.com/thegruber/linkpeek/issues/new/choose).
- Read the [contribution guide](https://github.com/thegruber/linkpeek/blob/main/CONTRIBUTING.md) before opening a pull request.
- Report vulnerabilities privately through [GitHub Security Advisories](https://github.com/thegruber/linkpeek/security/advisories/new).

If linkpeek saves you time, [star the repository](https://github.com/thegruber/linkpeek) so other developers can find it too.

## Examples and contributing

Framework examples are in [examples](https://github.com/thegruber/linkpeek/tree/main/examples): Next.js, Express, Cloudflare Workers, React, Supabase Edge Functions, and Bun. To work on linkpeek itself, see the [contribution guide](https://github.com/thegruber/linkpeek/blob/main/CONTRIBUTING.md).

## License

MIT © Adrian Gruber
