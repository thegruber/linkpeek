# Release Checklist

1. Confirm `package.json` has the intended version.
2. Confirm `CHANGELOG.md` has an entry for that version.
3. Run the full local gate:

```bash
npm ci
npm run quality
```

4. Confirm the package emits both module formats and declaration files:

```bash
test -f dist/index.js
test -f dist/index.cjs
test -f dist/index.d.ts
test -f dist/index.d.cts
```

5. Inspect the dry-run package contents from `npm run package:check`.
6. Commit, merge to `main`, tag `v<version>`, and create a GitHub release.

Publishing is handled by GitHub Actions trusted publishing. Do not add long-lived npm tokens.
