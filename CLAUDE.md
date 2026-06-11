# linkpeek

## Quick Reference
- Install: `npm ci`
- Build: `npm run build` (tsup -> `dist/`)
- Test: `npm run test` (vitest, fixture/mock tests only by default)
- Live tests: `LINKPEEK_LIVE_TESTS=1 npm run test`
- Lint: `npm run lint` (Biome)
- Lint fix: `npm run lint:fix`
- Typecheck: `npm run typecheck`
- Package checks: `npm run package:check` (publint, Are The Types Wrong, npm dry-run pack)
- Benchmark: `npm run benchmark`
- Live benchmark: `npm run benchmark:live`
- Full local gate: `npm run quality`

## Architecture
- `src/types.ts` — public TypeScript interfaces
- `src/errors.ts` — `LinkpeekError` with machine-readable `code` values
- `src/resolve.ts` — entity decoding and safe URL resolution helpers
- `src/parse.ts` — SAX parser using `htmlparser2` (entities are decoded exactly once, by htmlparser2 — never re-decode its output)
- `src/fetch.ts` — streaming fetch, byte limit, redirect validation, SSRF host checks, charset detection
- `src/index.ts` — public API (`preview`, `parseHTML`, `presets`, `validateUrl`, `isPrivateHost`, `LinkpeekError`)

## Design Rules
- Runtime dependency policy: keep `htmlparser2` as the only runtime dependency.
- Default mode is fast: 30 KB, head-first parsing, no body scan, no meta-refresh.
- `presets.quality` may trade speed for better extraction: 200 KB, body JSON-LD/image fallback, meta-refresh.
- Do not change the ESM output path: `dist/index.js` is the ESM file because `"type": "module"`.
- Package exports must keep separate ESM and CJS declaration files:
  - import types: `./dist/index.d.ts`
  - require types: `./dist/index.d.cts`
- Node support starts at Node 22. Node 20 is EOL and must not be reintroduced to CI or docs.

## Security Rules
- Validate the initial URL and every HTTP redirect before fetching the next target.
- Keep private/internal IPs blocked by default; `allowPrivateIPs` is an explicit opt-in.
- Extracted metadata URLs for image, favicon, canonical, video, audio, and oEmbed must only return `http:` or `https:`.
- Never recommend forwarding user cookies, authorization headers, or internal service tokens to arbitrary preview URLs.
- Platform `fetch` owns final DNS resolution; document SSRF limits honestly.

## Testing
- Fixture and mock tests are the default; keep them deterministic and fast.
- Live URL tests must remain opt-in behind `LINKPEEK_LIVE_TESTS=1`.
- Add tests before behavior changes. For parser/fetch/security changes, first verify the new test fails, then implement.
- Run `npm run test` before handing off. For release-facing changes also run `npm run build`, `npm run package:check`, and `npm audit`.
- Benchmark claims must be generated from `npm run benchmark` or documented npm registry commands. Do not invent performance or competitor numbers.

## CI/CD
- GitHub Actions runs lint, typecheck, test, build, audit, and package checks on Node 22, 24, and 26.
- Bun and Deno smoke coverage must remain in CI.
- npm is the source of truth for installs and publishing; keep `package-lock.json` committed.
- Do not commit `pnpm-lock.yaml`, `bun.lockb`, or generated tarballs.

## Release Workflow
1. Bump `package.json` version.
2. Add a `CHANGELOG.md` entry.
3. Run `npm run quality`.
4. Confirm `dist/index.js` and `dist/index.cjs` are emitted.
5. Tag and create a GitHub release.
6. Publish through GitHub Actions trusted publishing. Do not add long-lived npm tokens.
