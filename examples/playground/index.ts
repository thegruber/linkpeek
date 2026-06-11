// linkpeek playground — a single Cloudflare Worker that serves a minimal UI
// and a rate-limited preview API. Run locally with `wrangler dev`, deploy
// with `wrangler deploy`.
import { LinkpeekError, preview } from "linkpeek";

// Best-effort, per-isolate rate limit. Good enough for a public demo; put a
// Cloudflare WAF rate-limiting rule in front for real abuse protection.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = hits.get(ip);
	if (!entry || entry.resetAt < now) {
		hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT;
}

export default {
	async fetch(request: Request): Promise<Response> {
		const { pathname, searchParams } = new URL(request.url);

		if (pathname === "/api/preview") {
			const ip = request.headers.get("cf-connecting-ip") || "unknown";
			if (rateLimited(ip)) {
				return Response.json(
					{ error: "Rate limit exceeded, try again in a minute" },
					{ status: 429 },
				);
			}

			const url = searchParams.get("url");
			if (!url) {
				return Response.json(
					{ error: "Missing ?url= parameter" },
					{ status: 400 },
				);
			}

			try {
				// Demo limits are tighter than the library defaults: the library's
				// SSRF blocking stays on, and timeout/maxBytes are capped.
				const result = await preview(url, { timeout: 5000, maxBytes: 30_000 });
				const ok = result.statusCode >= 200 && result.statusCode < 300;
				return Response.json(result, {
					headers: {
						"Cache-Control": ok ? "public, max-age=600" : "no-store",
						"Access-Control-Allow-Origin": "*",
					},
				});
			} catch (err) {
				const code = err instanceof LinkpeekError ? err.code : "FETCH_FAILED";
				const message =
					err instanceof Error ? err.message : "Failed to fetch preview";
				return Response.json({ error: message, code }, { status: 422 });
			}
		}

		return new Response(PAGE, {
			headers: { "content-type": "text/html; charset=utf-8" },
		});
	},
};

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>linkpeek playground</title>
<style>
  :root { color-scheme: light dark; --border: #d0d4da; --muted: #6a7280; --accent: #2563eb; }
  @media (prefers-color-scheme: dark) { :root { --border: #3a4150; --muted: #9aa3b2; } }
  * { box-sizing: border-box; }
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 640px; margin: 0 auto; padding: 2rem 1rem 4rem; }
  h1 { font-size: 1.4rem; } h1 a { color: inherit; }
  p.sub { color: var(--muted); margin-top: -0.5rem; }
  form { display: flex; gap: 0.5rem; margin: 1.5rem 0; }
  input { flex: 1; padding: 0.6rem 0.8rem; font: inherit; border: 1px solid var(--border); border-radius: 8px; background: transparent; color: inherit; }
  button { padding: 0.6rem 1.1rem; font: inherit; border: 0; border-radius: 8px; background: var(--accent); color: #fff; cursor: pointer; }
  button:disabled { opacity: 0.6; }
  .card { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-top: 1rem; }
  .card img.hero { width: 100%; max-height: 320px; object-fit: cover; display: block; }
  .card .body { padding: 0.9rem 1rem; }
  .card .site { display: flex; align-items: center; gap: 0.45rem; color: var(--muted); font-size: 0.85rem; }
  .card .site img { width: 16px; height: 16px; }
  .card h2 { font-size: 1.05rem; margin: 0.35rem 0; }
  .card p { margin: 0; color: var(--muted); font-size: 0.92rem; }
  .error { border: 1px solid #dc2626; border-radius: 8px; padding: 0.8rem 1rem; margin-top: 1rem; }
  .error code { color: #dc2626; }
  details { margin-top: 1rem; } summary { cursor: pointer; color: var(--muted); }
  pre { overflow: auto; font-size: 0.8rem; background: rgba(127,127,127,0.1); padding: 1rem; border-radius: 8px; }
  footer { margin-top: 2rem; color: var(--muted); font-size: 0.85rem; }
  footer a { color: inherit; }
</style>
</head>
<body>
<h1><a href="https://github.com/thegruber/linkpeek">linkpeek</a> playground</h1>
<p class="sub">Server-side link previews with SSRF protection on by default. Try any URL — private/internal targets are blocked by the library, not by this demo.</p>
<form id="f">
  <input id="url" type="url" required placeholder="https://github.com/thegruber/linkpeek" autocomplete="off">
  <button id="go">Preview</button>
</form>
<div id="out"></div>
<footer>Powered by <a href="https://www.npmjs.com/package/linkpeek">linkpeek</a> on Cloudflare Workers — 1 runtime dependency, ~7 KB gzipped.</footer>
<script>
const f = document.getElementById("f");
const out = document.getElementById("out");
const go = document.getElementById("go");
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
f.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = document.getElementById("url").value;
  go.disabled = true;
  out.innerHTML = "<p>Fetching…</p>";
  try {
    const res = await fetch("/api/preview?url=" + encodeURIComponent(url));
    const data = await res.json();
    if (!res.ok) {
      out.innerHTML = '<div class="error"><code>' + esc(data.code || String(res.status)) + "</code> " + esc(data.error || "Request failed") + "</div>";
      return;
    }
    const hero = data.image ? '<img class="hero" src="' + esc(data.image) + '" alt="' + esc(data.imageAlt || "") + '">' : "";
    const favicon = data.favicon ? '<img src="' + esc(data.favicon) + '" alt="">' : "";
    out.innerHTML =
      '<div class="card">' + hero +
      '<div class="body"><div class="site">' + favicon + "<span>" + esc(data.siteName || "") + "</span></div>" +
      "<h2>" + esc(data.title || "(no title)") + "</h2>" +
      "<p>" + esc(data.description || "") + "</p></div></div>" +
      "<details><summary>Raw JSON</summary><pre>" + esc(JSON.stringify(data, null, 2)) + "</pre></details>";
  } catch (err) {
    out.innerHTML = '<div class="error">' + esc(String(err)) + "</div>";
  } finally {
    go.disabled = false;
  }
});
</script>
</body>
</html>`;
