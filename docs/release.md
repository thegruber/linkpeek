# Release Checklist

1. Add a `CHANGELOG.md` entry for the new version. The publish workflow refuses to run
   without one.
2. From a clean `main`, run release-it with a `GITHUB_TOKEN` that can create releases:

```bash
npm run release -- patch --ci   # or minor / major
```

This runs the full quality gate (`npm run quality`), bumps `package.json`, commits, tags
`v<version>`, pushes, and creates the GitHub release.

3. The GitHub release triggers `.github/workflows/publish.yml`, which re-runs CI, verifies the
   tag matches `package.json` and the changelog entry exists, then publishes to npm through
   trusted publishing with provenance under the `npm` deployment environment.

Publishing never uses long-lived npm tokens. If the publish job fails, fix the cause and re-run
the workflow from the release; do not publish from a local machine.
