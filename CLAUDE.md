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

## CI/CD
- GitHub Actions runs on every push/PR: lint + typecheck + test + build on Node 20 & 22, Bun, and Deno
- Node 18 is not supported (vitest@4 requires Node 20.12+); `engines.node` is `>=20.0.0`
- Deno smoke test: `test/deno-smoke.ts` (runs after build against `dist/index.js`)

## Release workflow
1. Bump version in `package.json`
2. `npm run build` — confirm `dist/index.js` (ESM) and `dist/index.cjs` (CJS) are emitted
3. `git tag vX.Y.Z && git push origin vX.Y.Z`
4. Create GitHub release via `gh release create`
5. `npm publish` — `prepublishOnly` runs `build` automatically

## Exports gotcha
`"type": "module"` in package.json means tsup outputs `dist/index.js` as the ESM file — NOT `dist/index.mjs`.
The exports map must use `"import": "./dist/index.js"` and `"module": "./dist/index.js"`.
Never change these back to `.mjs` — that file is never written.
