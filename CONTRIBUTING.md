# Contributing to linkpeek

Thanks for your interest in contributing.

## Development setup

1. Install dependencies:

```bash
npm install
```

2. Run quality checks:

```bash
npm run lint
npm run typecheck
npm test
```

3. Build package output:

```bash
npm run build
```

## Development guidelines

- Keep runtime dependency count minimal.
- Preserve fast-path behavior:
  - head-only parsing
  - streaming fetch with byte limit
  - early exits where possible
- Add tests for every behavior change.
- Prefer fixture-based tests for determinism.
- Keep public API changes backward compatible unless a major release is intended.

## Pull request checklist

- [ ] Tests added/updated
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] README updated (if behavior/API changed)
- [ ] Changelog entry added (if you maintain one)

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

