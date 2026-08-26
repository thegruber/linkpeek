# Competitive benchmark

Same-corpus, end-to-end benchmark required by the claim policy in
[docs/comparison.md](../../docs/comparison.md) before any competitive speed
claim. Every package previews identical URLs served by a local HTTP server
(no external network), on the same Node process, with defaults except the
options each package needs to reach `127.0.0.1` (documented in `bench.mjs`).

## Run

```bash
(cd ../.. && npm run build)
npm install
npm run bench
```

## Results and claim policy

The dated results matrix, exact package versions, interpretation, security sources, and reproduction caveats live in [docs/comparison.md](../../docs/comparison.md). It is the single source of truth so a benchmark refresh cannot leave several public tables inconsistent.

The harness prints raw measurements for each run. Localhost networking is near-free, so the results isolate library overhead rather than live-network latency. `link-preview-js` is measured with native fetch plus `getPreviewFromContent()` because its current destination policy rejects the local IP-literal benchmark host. Re-run before citing and update the dated evidence notes when versions or results change.
