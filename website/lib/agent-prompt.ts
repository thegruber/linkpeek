import { siteUrl } from "@/lib/shared";

/**
 * A ready-to-paste task for coding agents (Claude Code, Cursor, Codex,
 * Copilot): context, steps, rules and a definition of done, with links the
 * agent can read. Shown on the homepage and quick start, served as
 * /prompt.md and linked from llms.txt.
 */
export const agentPrompt = `Add link previews to this app with linkpeek.

## Context
- linkpeek is a TypeScript library on npm. \`preview(url)\` fetches a page and returns its Open Graph, Twitter Card and JSON-LD metadata as one flat object; missing fields are \`null\`.
- It reads only the page's <head>, runs on Node.js 22.12+, Bun, Deno and edge runtimes (Cloudflare Workers, Vercel), and has one dependency.
- Docs written for agents: ${siteUrl}llms.txt (full text: ${siteUrl}llms-full.txt).

## Steps
1. Install it with this project's package manager, e.g. \`npm install linkpeek\`.
2. Add a server endpoint \`GET /api/preview?url=…\` that calls \`preview(url)\` and returns \`{ title, description, image, siteName, favicon, canonicalUrl, statusCode }\` as JSON. Use the framework's server routes (Next.js Route Handler, Express, Hono, a Worker). Browsers may not read other sites (CORS), so fetching stays on the server.
3. Add a link preview card component that calls the endpoint and shows the image, title, description and host, with a loading state and a hostname-only fallback when fields are \`null\` or the request fails.
4. Cache successful results (\`statusCode < 400\`) for about a day, keyed by URL. Do not cache errors.

## Rules
- Keep linkpeek's defaults: \`allowPrivateIPs\` stays off, timeouts and byte limits stay on.
- Never forward the user's cookies or authorization headers to the previewed URL.
- Catch \`LinkpeekError\` and branch on \`error.code\` (\`INVALID_URL\`, \`UNSUPPORTED_PROTOCOL\`, \`PRIVATE_NETWORK_BLOCKED\`, \`TIMEOUT\`, \`TOO_MANY_REDIRECTS\`); return 400 for invalid input and 422 for the rest.
- Rate-limit the endpoint if it is public. Render returned strings as text, never as HTML.

## Done when
- \`/api/preview?url=https://github.com\` returns a title and an image.
- The card renders for a working URL and falls back cleanly for a broken one.
- Types check and existing tests pass.

Reference: ${siteUrl}quick-start/ · Next.js: ${siteUrl}integrations/nextjs/ · Security: ${siteUrl}security/
`;
