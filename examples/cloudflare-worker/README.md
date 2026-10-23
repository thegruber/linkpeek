# Cloudflare Worker — Link Preview at the Edge

Deploy a link preview API to Cloudflare's edge network.

## Setup

```bash
npm install linkpeek
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Usage

```bash
curl "https://link-preview-worker.<your-subdomain>.workers.dev/?url=https://github.com"
```

The example sets browser/downstream cache headers for 2xx previews. It does
not use the Workers Cache API; each request reaching the handler fetches the
target again. Add shared caching and rate limiting for a public service.
