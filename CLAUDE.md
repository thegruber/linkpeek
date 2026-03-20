# linkpeek

## Quick reference
- Build: `npm run build` (tsup -> dist/)
- Test: `npm run test` (vitest)
- Test (watch): `npm run test:watch`
- Lint: `npm run lint` (biome)
- Lint fix: `npm run lint:fix` (biome check --write .)
- Typecheck: `npm run typecheck` (tsc --noEmit)

## Architecture
- `src/types.ts` — TypeScript interfaces (PreviewOptions, PreviewResult)
- `src/resolve.ts` — URL resolution + HTML entity decoding
- `src/parse.ts` — SAX parser using htmlparser2 (core logic)
- `src/fetch.ts` — Streaming HTTP fetch with byte limit
- `src/index.ts` — Public API (preview, parseHTML)

## Key design decisions
- Single dependency: htmlparser2 (SAX parser)
- Stops at </head> for speed — don't change this
- Twitterbot UA to get server-rendered meta tags
- 30KB default download limit (200KB for quality preset) — enough for all <head> content
- Meta-refresh redirect: followed once if initial parse finds no title
- Fallback chain: OG -> Twitter -> JSON-LD -> HTML tags
- SSRF protection: private/internal IPs blocked by default (`allowPrivateIPs` to opt in)
- Dual CJS + ESM output via tsup; charset auto-detected from Content-Type header

## Testing
- Fixtures in test/fixtures/ — static HTML for deterministic tests
- Live URL tests are optional/slow — keep fixture tests fast
- Run `npm test` before committing
