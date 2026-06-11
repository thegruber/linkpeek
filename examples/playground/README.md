# linkpeek playground

A single Cloudflare Worker that serves a minimal preview-card UI and a
rate-limited `/api/preview` endpoint. This is the hosted demo for linkpeek —
it dogfoods the edge-runtime claim and shows the SSRF protection live (try
`http://169.254.169.254/` and watch it get blocked by the library).

## Run locally

```bash
npm install linkpeek wrangler
npx wrangler dev
```

Open http://localhost:8787.

## Deploy

```bash
npx wrangler deploy
```

This deploys to `linkpeek-playground.<your-subdomain>.workers.dev`. Add a
custom domain via the route in `wrangler.toml` if you have one.

Once it is live, link it from the main README ("Try it" badge or a link under
the hero image) — do not link it before it is deployed.

## Production notes

- The in-memory rate limit is per-isolate and best-effort. For real abuse
  protection add a Cloudflare WAF rate-limiting rule on `/api/preview`.
- Successful previews are served with `Cache-Control: public, max-age=600`;
  error statuses are `no-store`.
- The endpoint caps `timeout` at 5s and `maxBytes` at 30 KB and never enables
  `allowPrivateIPs` — the library's SSRF blocking is the demo.
- Watch usage in the Cloudflare dashboard; the free tier (100k requests/day)
  is plenty for a demo endpoint.
