# Changelog

All notable changes to this project are documented here.

## 2.1.3 - 2026-08-26

### Changed

- Default head-only parsing now stops the tokenizer as soon as the head ends instead of scanning the remaining HTML; refreshed same-corpus benchmarks measure a representative 0.35 ms median on the 489 kB fixture.
- Refreshed the private competitive benchmark dependencies and measured comparison tables, clearing its audit findings, adding Dependabot coverage for the benchmark lockfile, and documenting the Node and TypeScript major-version policy.
- Updated Biome, Vitest, publint, release-it, and the conventional-changelog release plugin to their current compatible releases.

### Fixed

- Caller-triggered aborts during a meta-refresh request are rethrown instead of being mistaken for an unreachable refresh target and returning partial metadata.
- Invalid `timeout` and `maxRedirects` values now fail before fetching with `LinkpeekError` code `INVALID_OPTIONS`, avoiding redirect-limit bypasses and Node timer overflow behavior.
- JSON-LD MIME type matching is now case-insensitive.
- Relative metadata and meta-refresh URLs now resolve against the document's first safe `<base href>`.

### Security

- Hardened metadata storage against inherited-object-property injection and replaced polynomial icon-size matching with a linear parser, resolving the actionable findings from the repository's first CodeQL scan.
- Updated the release dependency tree to remove the reported `undici`, `ip-address`, and `nanoid` advisories; both root and benchmark dependency trees now report zero npm audit findings.
- Restored the full development-tree high-severity audit as a blocking local, CI, and release gate, and added the benchmark lockfile audit to the same gate.

## 2.1.2 - 2026-07-31

### Added

- A package smoke test that exercises both built ESM and CommonJS exports before packing.
- Enforced test-coverage floors in CI.
- Explicit npm lifecycle-script approvals for the build and optional file-watcher dependencies.

### Changed

- Refreshed compatible development tooling, aligned Node type declarations with the Node 22 support floor, tightened TypeScript library checks, and grouped Dependabot minor/patch updates.
- Updated pinned GitHub Actions releases, disabled checkout credential persistence, and added registry-signature verification to publishing.
- Clarified the SSRF threat model and the requirements placed on custom `fetch` implementations.

### Security

- Rejects input URLs containing embedded usernames or passwords.
- Drops credential-bearing extracted metadata URLs.
- Extends literal-IP blocking for current IANA non-global, documentation, benchmarking, dummy, and deprecated address ranges while preserving documented globally reachable protocol-assignment exceptions.
- Updated the development dependency tree to resolve all currently reported npm audit findings.

## 2.1.1 - 2026-06-12

### Changed

- Documentation polish: tightened README wording, added the License section, and trimmed npm
  keywords to a precise set. No runtime changes.

## 2.1.0 - 2026-06-11

### Added

- `LinkpeekError` with machine-readable `code` values (`INVALID_URL`, `UNSUPPORTED_PROTOCOL`, `PRIVATE_NETWORK_BLOCKED`, `SENSITIVE_HEADER`, `INVALID_OPTIONS`, `TOO_MANY_REDIRECTS`, `TIMEOUT`) so callers can branch on failure categories instead of matching message strings. Timeouts now throw a typed `TIMEOUT` error instead of an opaque `AbortError`.
- `signal` option: pass an `AbortSignal` to cancel an in-flight preview. Caller aborts are rethrown as-is and never wrapped as timeouts.
- `fetch` option: inject a custom fetch implementation for proxies, caching layers, or testing.
- `maxRedirects` option (default: 10).
- Charset detection for pages that declare encoding only in `<meta charset>` or `http-equiv` tags (with BOM sniffing). Previously only the `Content-Type` header was honored, producing mojibake for many legacy/CJK/Cyrillic pages.
- Public exports for `validateUrl` and `isPrivateHost` so URLs can be pre-validated before queueing.
- Coverage tooling (`npm run test:coverage`).
- A real Bun runtime smoke test in CI (`test/bun-smoke.ts`); the previous Bun job ran the toolchain under Node via shebangs.

### Changed

- `followMetaRefresh` now follows refreshes with a delay of 10 seconds or less regardless of whether the interstitial page has a title. Previously it only fired when no title was found, which skipped exactly the challenge/interstitial pages the option targets (they all have titles). Slower refreshes are treated as page reloads and ignored.
- Custom request headers are no longer forwarded on cross-origin redirects; redirected origins receive default headers only.
- Custom headers now override defaults case-insensitively (`{"user-agent": ...}` replaces the default instead of fetch merging both values).
- JSON-LD `@graph` payloads: root-level properties are now inspected alongside graph items, and object-valued (non-array) `@graph` no longer discards the entire script.
- Documents that legally omit `<head>`/`<body>` now treat the first flow-content element as the start of the body, enabling the body image fallback and keeping body metadata out of head scope.
- `npm audit` gates (CI, `quality`, `publish:check`) now scope to the runtime dependency tree (`--omit=dev`); the full-tree audit runs non-blocking in CI.
- Tarball now includes `CHANGELOG.md`, and the exports map exposes `./package.json`.
- All GitHub Actions are pinned to commit SHAs (Dependabot keeps the pins fresh), the publish workflow gained a top-level read-only permission default and a CHANGELOG-entry gate, and `npm run typecheck` now also typechecks the test suite.
- Added a same-corpus competitive benchmark harness (`benchmarks/competitive`) and measured footprint/speed comparison tables in the README and `docs/comparison.md`.

### Fixed

- Crash (uncaught `RangeError`) on pages containing escaped out-of-range numeric character references such as `&amp;#x110000;`. Entity decoding is now done exactly once by the HTML parser; the redundant second decode pass that both caused the crash and corrupted legitimate text (`X &amp;amp; Y` became `X & Y` instead of `X &amp; Y`) has been removed. `decodeEntities` itself now maps out-of-range and surrogate code points to U+FFFD per the HTML spec.
- The redirect-limit error path now cancels the final response body before throwing, releasing the connection.
- Non-HTML response bodies are canceled immediately instead of being left undrained.

## 2.0.0 - 2026-06-01

### Breaking: migrating from 1.x

- Node.js 22+ is required (1.x supported Node 20). No API signatures changed:
  if you are on Node 22 or newer, upgrading from 1.x requires no code changes.

### Changed

- Raised the Node.js engine floor to 22+.
- Standardized local and CI installs on npm with a committed `package-lock.json`.
- Updated package exports to provide separate ESM and CommonJS declaration files.
- Made live URL tests opt-in with `LINKPEEK_LIVE_TESTS=1`.
- Updated README, security policy, agent instructions, and contribution guidance for the 2026 support policy.
- Added benchmark tooling, focused comparison documentation, release guidance, discoverability keywords, and `llms.txt`.

### Security

- Validates every HTTP redirect target before following it.
- Rejects common credential-bearing custom request headers before fetching arbitrary preview URLs.
- Blocks additional private, reserved, multicast, IPv4-mapped IPv6, and IPv6 translation address forms that embed private IPv4 targets.
- Filters extracted metadata URLs to `http:` and `https:` for media, canonical, favicon, and oEmbed fields.
- Ensures the public `parseHTML()` fallback URL never returns non-HTTP(S) canonical values.

### Fixed

- Enforces `maxBytes` exactly when a streamed response chunk crosses the configured byte limit.
- Preserves the first duplicate Open Graph/Twitter metadata value instead of overwriting it with later duplicates.
- Handles multi-token `<link rel>` values for canonical, favicon, image source, and oEmbed discovery.
- Parses meta-refresh redirects regardless of meta attribute order.
- Stops default head-only metadata parsing when `<body>` opens, even if `</head>` is omitted.
