# Changelog

All notable changes to this project are documented here.

## 2.0.0 - 2026-06-01

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
