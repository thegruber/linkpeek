# Contributing to linkpeek

Thanks for your interest in contributing.

## Development setup

1. Install dependencies from the committed npm lockfile:

```bash
npm ci
```

The published library supports Node.js 22+. The current release-it toolchain
requires Node.js 22.21+ or 24+, so use a current Node 22 patch release when
running release commands locally.

2. Run the full quality gate (lint, typecheck, tests, audit, build, package checks):

```bash
npm run quality
```

Individual steps are also available: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run package:check`, `npm run benchmark`.

3. Run live URL tests only when intentionally checking network extraction quality:

```bash
LINKPEEK_LIVE_TESTS=1 npm run test
```

## Development guidelines

- Keep runtime dependency count minimal.
- Preserve fast-path behavior:
  - head-only parsing
  - streaming fetch with byte limit
  - early exits where possible
- Add tests for every behavior change.
- Prefer fixture-based tests for determinism.
- Keep live URL tests opt-in; CI should not depend on third-party websites.
- Keep public API changes backward compatible unless a major release is intended.
- Keep npm as the source of truth for installs and publishing.
- Do not commit generated tarballs or non-npm lockfiles.
- Keep benchmark and competitor claims tied to reproducible commands in `docs/comparison.md`.

## Pull request checklist

- [ ] Tests added or updated for every behavior change
- [ ] `npm run quality` passes
- [ ] `npm run benchmark` run (if performance, package-size, or comparison docs changed)
- [ ] README and CHANGELOG updated (if behavior or public API changed)

## Commit style

Use short, descriptive commits focused on one logical change.

Examples:

- `fix: improve og:image fallback resolution`
- `perf: stop parse once head closes`
- `docs: add benchmark usage notes`

## Reporting issues

Please include:

- URL being previewed
- expected metadata vs actual metadata
- Node.js version
- minimal reproducible snippet
