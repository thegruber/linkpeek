# linkpeek discoverability audit — 2026-10-29

Prioritize documentation accuracy, complete API answers, and owner-side measurement. The package and site already have the main discovery mechanisms; this audit found no evidence that adding keywords, schema, or AI-specific files would guarantee more users, rankings, or citations.

## Scope and evidence

Inspected `package.json` (2.1.6), `README.md`, `website/pages.json`, `website/template.html`, `scripts/build-docs.mjs`, affected page content, public types, and the publishing/docs workflows. Local findings describe the sources at inspection time; concurrent implementation changes appearing during research were not audited. Used official documentation, web search, and unauthenticated HTTP GETs; no browser preview, publishing, account changes, or submissions.

**Public observations on this date:** all ten routes in `website/pages.json` returned HTTP 200, each with one H1 and its expected self-canonical URL. The [sitemap](https://thegruber.github.io/linkpeek/sitemap.xml) returned 200 and listed those ten routes; [llms.txt](https://thegruber.github.io/linkpeek/llms.txt) also returned 200. The [home page](https://thegruber.github.io/linkpeek/) and [API page](https://thegruber.github.io/linkpeek/api/) contained static content, indexable robots metadata, and no `X-Robots-Tag` response header. Both [host-root robots.txt](https://thegruber.github.io/robots.txt) and [project-path robots.txt](https://thegruber.github.io/linkpeek/robots.txt) returned 404.

**Not established:** Google/Bing indexing, selected canonicals, rankings, query demand, AI citation frequency, traffic, installation conversion, actual crawler visits, or private npm settings. HTTP accessibility is not indexing evidence. No visual, mobile, accessibility, or Core Web Vitals evaluation was performed. No competitor performance numbers were generated or independently revalidated.

## Verified strengths

- **npm metadata and onboarding:** descriptive package summary, relevant keywords, repository/homepage/issue links, MIT license, explicit Node minimum, separate ESM/CJS declarations, installation command, working-shape examples, security caveats, and support links. npm explicitly identifies descriptions and keywords as discovery inputs and recommends useful root README files. Keep these accurate; more synonyms are not a demonstrated growth strategy. Sources: [npm package metadata](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/), [README guidance](https://docs.npmjs.com/about-package-readme-files/).
- **Published trust evidence:** the [latest registry record](https://registry.npmjs.org/linkpeek/latest) reports 2.1.6, matching the local description, homepage, repository, and Node `>=22.12.0` floor. Its [attestation endpoint](https://registry.npmjs.org/-/npm/v1/attestations/linkpeek@2.1.6) returned publish and SLSA provenance attestations. Local `publish.yml` uses GitHub-hosted Actions, `id-token: write`, Node 24, npm 11.21.1, and `npm publish --provenance --access public`. Attestation presence was checked, not cryptographic validity or private publisher configuration. Provenance identifies build/source origins; it does not certify vulnerability-free code or search ranking. Sources: [npm provenance](https://docs.npmjs.com/generating-provenance-statements/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/).
- **Search-readable documentation:** the builder produces static HTML, ordinary navigation links, page-specific titles/descriptions, canonical URLs, social metadata, a sitemap, and structured data (`SoftwareSourceCode`, `TechArticle`, breadcrumbs). Integration, parser, security, and decision pages already cover distinct developer tasks. These support discovery and comprehension under [Google's SEO fundamentals](https://developers.google.com/search/docs/fundamentals/seo-starter-guide); markup alone does not establish enhanced-result eligibility.
- **Useful differentiation:** the README explains the fast/quality trade-off, HTTP error behavior, server-side boundary, DNS limitations, and unsuitable use cases. Benchmark pages label dated evidence and distinguish retained/source bytes from wire traffic. Preserve that specificity instead of replacing it with generic performance or safety superlatives.

## Actionable priorities

1. **P1 — Correct the runtime requirement everywhere.** `website/content/home.html` and the live home page say Node.js 22 or newer; the package and README require **22.12+**. Match the exact supported floor, including CommonJS. This is a confirmed public mismatch, not an inferred SEO defect.
2. **P1 — Make the API page a complete reference.** `website/content/api.html` summarizes result fields without their complete types/nullability, omits a full error-code list and helper signatures, and its error snippet lacks imports. Expand it from `src/types.ts`, `src/errors.ts`, and the README; include HTTP 4xx/5xx behavior, cancellation, preset values, and `validateUrl`/`isPrivateHost` signatures. Add a deterministic input/output example using `parseHTML`. Acceptance: developers can implement and troubleshoot a preview without finding missing contracts in source code.
3. **P1 — Reduce documentation drift.** Runtime guidance already demonstrates drift between handwritten HTML and the README. Adopt a small release checklist or shared source for factual requirements/API tables. Several `pages.json` Markdown alternates point to the general README rather than an equivalent page, notably the AI-agent and parser guides. Either generate genuinely equivalent Markdown or label the README as related source rather than an alternate representation. This improves reader/agent fidelity; it is not a Google ranking requirement.
4. **P2 — Deepen existing task pages before adding more landing pages.** Add focused troubleshooting for empty SPA metadata, upstream 403 responses, invalid options, non-HTML URLs, and caching error responses. Replace the README's universal claim that bot protection blocks every library with a qualified description of linkpeek's limitations. Add explicit expected outputs and direct API/security links. Preserve dated comparisons; rerun the documented benchmark harness and recheck upstream sources before making current competitor claims. The present August measurements must not be relabeled as October results.
5. **P2 — Maintain publishing and README fidelity.** Review how README links render on npm, especially relative links to files outside the packed `dist`/changelog set; use canonical documentation or repository URLs where needed. The npm README updates with a new package version, so a GitHub edit alone does not update npm. Retain OIDC/provenance and package checks; do not create a token-based publishing workaround. Sources: [npm README lifecycle](https://docs.npmjs.com/about-package-readme-files/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/).
6. **P3 — Add only justified freshness machinery.** The sitemap lacks `lastmod`; that is optional, not a blocker. Add it only when derived from significant content changes, never the build clock. For ten stable pages, owner sitemap submission is a better first step than new submission infrastructure. Sources: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [Bing discovery guidance](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a).

## Google AI search, Bing, and OpenAI

Google's current [generative AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) emphasizes useful original content and ordinary crawl/index fundamentals. It says Google Search does not use `llms.txt` for visibility or ranking and requires no special AI schema. Keep linkpeek's file as an optional documentation index for consumers that use it. Avoid synthetic mentions, keyword-stuffed pages, or claims of guaranteed GEO placement.

**2026 owner check:** Google now documents a Search Console **Search generative AI** inclusion control, rolled out globally August 31, 2026. Inclusion is the default, but child properties can inherit a parent's setting; linkpeek's effective setting is unverified. The separate generative AI performance report measures impressions and may be absent below its reporting threshold. Do not rely on older guidance that omits these controls or promise AI-specific click data from that report. Sources: [inclusion control](https://support.google.com/webmasters/answer/16908024), [AI performance report](https://support.google.com/webmasters/answer/16984139).

[Bing's current guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a) apply crawlability, canonicalization, accurate content, and crawlable links to search and Copilot grounding. `NOARCHIVE` prevents use in Copilot/grounding; `NOCACHE` restricts use to URL/title/snippet. The inspected template contains neither. Avoid adding these casually when citation eligibility is intended. IndexNow is a possible later freshness improvement, not a ranking guarantee.

[OpenAI distinguishes its crawlers](https://developers.openai.com/api/docs/bots): `OAI-SearchBot` serves search discovery; `GPTBot` concerns potential model training; `ChatGPT-User` handles user-triggered visits and is not the search inclusion control. An owner can allow search while independently declining training. Check actual host-level rules and any hosting/IP restrictions; successful ordinary GETs do not prove crawler access. Training permission is not a prerequisite for search visibility.

## First-party documentation patterns worth adopting

- [Cheerio's introduction](https://cheerio.js.org/docs/intro/) leads with a clear capability boundary, exact runtime requirement, installation, ESM/CommonJS examples, and a short progressive walkthrough. Apply that clarity to linkpeek's home page and its no-JavaScript-rendering limitation.
- [Zod's introduction](https://zod.dev/) connects a short typed example to installation, requirements, migration/release guidance, and ecosystem resources. Its MCP/`llms.txt` offerings demonstrate optional developer tooling, not evidence that those features caused search success. For linkpeek, prioritize accurate examples and release guidance before building an MCP service.
- [Metascraper's first-party README](https://github.com/microlinkhq/metascraper) shows inputs, an output object, field explanations, rule composition, and API detail. Adopt explicit output contracts and honest fetch-ownership explanations. Its [documentation site's](https://metascraper.js.org/) fetched HTML exposed metadata but little substantive body text; its README supplied the reviewable content. No visual or search-performance conclusion is drawn from this fetch.

## Follow-ups requiring owner access

- **Search Console:** verify or access the URL-prefix property `https://thegruber.github.io/linkpeek/`; submit its existing sitemap; inspect home/API/integration URLs for indexing and Google-selected canonical status. Check the AI inclusion setting and inheritance. Record baseline search impressions/clicks and available AI impressions before comparing later periods. These actions were not performed.
- **Host-root robots:** this project's `/linkpeek/` deployment cannot by itself publish `https://thegruber.github.io/robots.txt`. Coordinate with the account-level Pages site's owner to add the sitemap directive and any deliberate crawler policies at the origin root, preserving policies for other projects. The builder correctly emits robots only when configured at `/`. A project-subdirectory robots file would not solve this. Root 404 currently means **no crawl restrictions to Google**, not blocked indexing. Sources: [robots placement](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt), [404 handling](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec), [GitHub user/project site structure](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
- **Bing Webmaster Tools:** verify ownership, submit the sitemap, inspect index coverage, and review available AI Performance citation data. Citation counts/share are observational, not rankings or proof of adoption. Sources: [AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/), [2026 reporting expansion](https://blogs.bing.com/search/2026/6/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare/).
- **npm/GitHub owners:** confirm trusted-publisher repository, `publish.yml`, environment `npm`, and allowed direct-publish action; review token restrictions/2FA in package settings. Public attestations do not expose all account controls. Use GitHub traffic/dependents and the existing `npm run downloads` scorecard alongside search data; download requests are not unique adopters. Evaluate sustained use and successful integrations rather than raw downloads alone.

## Validation and limits

This research task edited only this report. Public checks used HTTP GETs and registry metadata; no build, release, or benchmark claims were inferred from them. `npm run test` was attempted as required by AGENTS.md but exited 127: `vitest: not found` (dependencies were not installed at that time). No dependencies or other files were changed by this research task.

## Implemented locally after the audit

- Retained the existing static HTML stack and public routes; added a troubleshooting route. Improved the homepage, reading layout, mobile navigation, active navigation, section links, keyboard focus, and concise headings.
- Added an editable local demo using the actual `parseHTML` implementation, bundled only for the Open Graph parser guide. Its static sample remains available without JavaScript. Input is bounded, output is rendered as text, and the demo does not fetch target URLs.
- Completed the API reference, corrected Node.js 22.12+ and browser/parser guidance, removed the README's universal bot-blocking claim, and made README repository links absolute for npm readers. Added Bun and Deno keywords without changing the package name or version.
- Generated equivalent page Markdown, `llms.txt`, and `llms-full.txt` from the same authored HTML. Added artifact-level checks for deployment base paths, local links and anchors, preserved code, JSON-LD parsing, and the 404 indexing policy.
- Added explicit social image metadata and a new 1200 × 630 PNG rendered from `website/social.html`. Its source contains no fabricated popularity or performance claims.
- Added a scoped `release-it` override from Undici 7.29.1 to 7.30.1. All three repository audit commands then reported zero vulnerabilities. No runtime dependency or library behavior changed.

### Design record and visual verification

Applied taste v2 **The quiet instrument**, seed **1538095580**, with the user's explicit constraints: documentation first, no hero, slogans, promotional panels, oversized headings or decorative motion. The original dark palette remains. Typography uses the native system sans-serif at 16px with restrained headings, rather than a geometric display face. No font download or font preload is needed. The homepage uses the same reading layout and section navigation as the reference pages. Its content is package description, installation, usage, parsing existing HTML, presets, integration links, and security limitations.

Guide headings use direct descriptions such as “Cookies and credentials” and “DNS resolution and rebinding.” Removed promotional recommendation copy, decorative link arrows, and jargon from examples and descriptions; technical terms remain where the API requires them.

The interactive parser lives in the Open Graph guide. The homepage loads no application JavaScript. The social preview names the package and its function without a slogan. Canonical URLs, descriptive page titles, structured data, internal links, sitemap and equivalent Markdown exports remain present; the visual simplification does not require sacrificing crawlable content.

No stock photography, video, fabricated testimonials, or unverified customer imagery was added. The parser sample is explicitly a demonstration on example.com. The social image is rendered from its checked-in HTML source using the same system font stack.

The taste source linter passed without findings. Chromium checks covered all **11 routes at 1440, 768, 390 and 320 px**: no page overflow, one H1, zero application scripts on the homepage, and no console exceptions. The relocated parser, body fallback opt-in and keyboard mobile navigation passed. Desktop, tablet and phone screenshots were inspected. These are browser emulation checks, not physical-device or screen-reader acceptance. The skill's marketing-photo, hero and forced-motion requirements are superseded by the user's documentation-only direction.

The final metadata audit confirmed unique titles and descriptions on all 11 pages, matching canonical/Open Graph URLs, sitemap inclusion, indexable robots metadata, and a valid 1200 × 630 social image. Local checks establish technical readiness, not live indexing or ranking gains.

### Quality and remaining work

`npm run quality` passed: lint, both typechecks, **264 passing tests / 21 opt-in live tests skipped**, all three audits, documentation build, ESM/CJS build and consumer smoke test, publint, Are The Types Wrong, and npm dry-run pack. The final documentation artifact checks and lint were repeated after the last layout/social-image changes. No live-network performance claims were added and old benchmark dates were preserved.

Changes are local and unreleased. Deploy the docs through the existing workflow and publish npm changes through the existing release process when authorized. The Search Console/Bing verification, sitemap submission, root-host crawler policy coordination, and measurement follow-ups above still require owner access; no rankings, indexing gains, or citation gains are claimed.


### Release preparation: 2.1.7

The changelog now contains the versioned entry required by the publish workflow. Package and lockfile versions remain at 2.1.6 intentionally: `release-it` owns the version bump, release commit and tag. The registry still reported 2.1.6, no remote `v2.1.7` tag existed, and remote `main` matched this branch's base during the readiness check.

Final review covered the complete working changes, including untracked files:

- **Standards:** corrected a Markdown whitespace bug that joined adjacent inline code spans. The existing artifact tests now protect the rendered API example for both root and project-subdirectory deployments. The regression failed on the old implementation and passed after the fix.
- **Requirements:** corrected the repository AI reference's error contract and restored the original benchmark measurement date as ordinary text. The minimal layout, system font, public documentation and local parser remain unchanged.

A fresh `npm ci`, `npm run test:coverage`, and `npm run quality` passed on Node.js 24.22.1 / npm 11.21.1. There are 264 passing tests and 21 intentionally skipped live tests. Coverage meets the existing thresholds; no thresholds or exclusions were relaxed. All three dependency audits returned zero vulnerabilities. Library builds, consumer smoke tests, publint, Are The Types Wrong, and npm dry-run packing passed. The package contains the expected eight files; documentation tooling and preview artifacts are not shipped in the tarball. CI's other runtime versions remain to be checked remotely. The standard `npm run benchmark` also completed successfully: its controlled stream probe requested 2 kB in fast mode and about 201.7 kB in quality mode, with cancellation in both cases. Live-network benchmarks were not enabled; historical comparison measurements were not replaced with these local timings.

To ship after merging these changes into `main`, use the existing authenticated release process from a clean, current `main` checkout:

```sh
npm run release -- patch --ci
```

That command creates version 2.1.7, pushes its release commit and tag, and creates the GitHub release that triggers trusted npm publishing. The docs workflow deploys on the corresponding `main` changes. The final reviewed changes are recorded in a local commit on `t3/improve-seo-docs-discoverability`. No push, merge, tag, deployment, or publication was performed during preparation.


### Live URL demo and agent-use clarification

The local documentation build includes a browser HTML parser. A live URL-fetching demo is explicitly deferred by the owner for this release. The repository already contains `examples/playground`, a Cloudflare Worker with a preview endpoint and a small UI, but no deployment URL is configured. [GitHub Pages serves static files](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), so arbitrary URL retrieval needs a separate server endpoint; browser CORS cannot be bypassed by a client-only form. No Worker integration, hosting configuration, URL form, or additional service is part of this release. The existing standalone Worker example remains unchanged. If a URL demo is reconsidered later, its cross-origin error handling and deployment controls need review first. There is no pending hosting decision for 2.1.7.

The [MCP tools specification](https://modelcontextprotocol.io/specification/latest/server/tools) establishes that an application can expose API calls as model-invoked tools with schemas. It does not establish linkpeek adoption, integration compatibility, or improvements to model quality. The repository supplies a framework-neutral helper, not an MCP server or tested framework adapter. Link labels and source cards are plausible uses inferred from the returned metadata fields. Article summarization, source verification, retrieval quality, and ranking improvements are not established by that functionality. README and guide wording now make that distinction explicit.

The owner confirmed the final 2.1.7 scope: minimal documentation, the local HTML parser, and the discoverability fixes; no live URL service. The complete `npm run quality` gate was repeated successfully after the agent-use clarification and final changelog update.
