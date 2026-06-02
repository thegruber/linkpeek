# Security Policy

## Supported Versions

Security updates are applied to the latest published version of `linkpeek`.

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Use GitHub's private vulnerability reporting or open a private GitHub security advisory for this repository. Include:

- affected version
- reproduction steps or proof of concept
- expected and actual impact
- runtime environment (Node, Bun, Deno, edge runtime)

If private advisory tooling is unavailable, open a public issue with minimal detail and ask for secure maintainer contact.

## Security Model

`linkpeek` is designed for server-side metadata extraction from untrusted URLs. It validates the initial URL and each HTTP redirect before fetching the next target.

By default, `preview()` blocks:

- localhost and `.localhost` hosts
- `.local` hosts
- private IPv4 ranges
- IPv4 link-local/cloud metadata ranges
- IPv4 multicast and reserved ranges
- IPv6 loopback, unique-local, link-local, multicast, documentation, discard, and IPv6 forms that embed private IPv4 addresses

Extracted metadata URLs for image, favicon, canonical, video, audio, and oEmbed fields are filtered to `http:` and `https:`.

Custom request `headers` reject common credential-bearing names, including cookies, authorization headers, API keys, and token headers.

## Caller Responsibilities

- Do not try to pass user cookies, authorization headers, internal API keys, or service tokens to arbitrary preview URLs.
- Keep `allowPrivateIPs` set to `false` for public user input.
- Treat all returned metadata as untrusted content.
- Apply your own rate limits and abuse controls around public preview endpoints.

## Known Limits

Runtime `fetch` implementations own DNS resolution and connection establishment. That means protection against DNS rebinding or platform-specific proxy behavior can vary by runtime. If your threat model includes hostile DNS or internal network segmentation requirements, run `linkpeek` in a network sandbox that cannot reach internal services.

## Response Targets

- Initial response: within 7 days
- Triage and severity assessment: within 14 days
- Patch and release timeline: depends on severity and exploitability
