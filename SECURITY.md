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

- URLs containing embedded usernames or passwords
- localhost and `.localhost` hosts
- `.local` hosts
- private, link-local, cloud-metadata, multicast, documentation, benchmarking, reserved, and other non-global special-use IPv4 ranges
- IPv6 loopback, unique-local, link-local, multicast, documentation, benchmarking, discard, dummy, deprecated, and other non-global special-use ranges
- IPv6 forms that embed a blocked IPv4 address

Extracted metadata URLs for image, favicon, canonical, video, audio, and oEmbed fields are filtered to credential-free `http:` and `https:` URLs.

Custom request `headers` reject common credential-bearing names, including cookies, authorization headers, API keys, and token headers.

## Caller Responsibilities

- Do not try to pass user cookies, authorization headers, internal API keys, or service tokens to arbitrary preview URLs.
- Keep `allowPrivateIPs` set to `false` for public user input.
- Custom `fetch` implementations must honor `RequestInit.redirect: "manual"` and the supplied abort `signal`.
- Treat all returned metadata as untrusted content.
- Apply your own rate limits and abuse controls around public preview endpoints.
- Use network-level egress controls when previewing hostile public input so the runtime cannot reach internal services.

## Known Limits

Runtime `fetch` implementations own DNS resolution and connection establishment. The built-in hostname checks do not pin a hostname to a validated DNS answer, so protection against DNS rebinding, DNS changes between checks and connections, or platform-specific proxy behavior varies by runtime. If your threat model includes hostile DNS or internal network segmentation requirements, run `linkpeek` in a network sandbox that cannot reach internal services.

The special-use address blocklist follows current IANA registries, but network-level policy remains the stronger control and should not be replaced by an application-level blocklist alone.

## Response Targets

- Initial response: within 7 days
- Triage and severity assessment: within 14 days
- Patch and release timeline: depends on severity and exploitability
