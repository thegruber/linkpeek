// Same-corpus, end-to-end benchmark: every package previews identical URLs
// served by a local HTTP server. Defaults are used except where a package
// needs an option to talk to 127.0.0.1 (documented per adapter below).
//
// Run from this directory:
//   (cd ../.. && npm run build) && npm install && npm run bench
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

import { getLinkPreview, getPreviewFromContent } from "link-preview-js";
import { preview } from "linkpeek";
import createMetascraper from "metascraper";
import msAuthor from "metascraper-author";
import msDate from "metascraper-date";
import msDescription from "metascraper-description";
import msImage from "metascraper-image";
import msPublisher from "metascraper-publisher";
import msTitle from "metascraper-title";
import msUrl from "metascraper-url";
import ogs from "open-graph-scraper";
import { unfurl } from "unfurl.js";
import urlMetadata from "url-metadata";

const metascraper = createMetascraper([
	msAuthor(),
	msDate(),
	msDescription(),
	msImage(),
	msPublisher(),
	msTitle(),
	msUrl(),
]);

// ── corpus: fixtures from the main test suite + a realistic heavy page ──
const fixturesDir = new URL("../../test/fixtures/", import.meta.url);
const small = {
	"og-standard.html": readFileSync(
		new URL("og-standard.html", fixturesDir),
		"utf-8",
	),
	"all-fields.html": readFileSync(
		new URL("all-fields.html", fixturesDir),
		"utf-8",
	),
	"recipe-blog.html": readFileSync(
		new URL("recipe-blog.html", fixturesDir),
		"utf-8",
	),
};
const para = `<p>${"Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(20)}</p>\n`;
const large =
	`<!DOCTYPE html><html><head>
	<title>Large Page</title>
	<meta property="og:title" content="Large Page OG Title">
	<meta property="og:description" content="A heavy page with a normal head.">
	<meta property="og:image" content="https://cdn.example.com/hero.jpg">
	<meta property="og:site_name" content="Heavy Site">
	</head><body>\n` +
	para.repeat(Math.ceil(500_000 / para.length)) +
	"</body></html>";
const corpus = { ...small, "large-500kb.html": large };

// ── local server ──
const server = createServer((req, res) => {
	const name = new URL(req.url, "http://x").pathname.slice(1);
	const body = corpus[name];
	if (!body) {
		res.writeHead(404).end();
		return;
	}
	res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
	res.end(body);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

// ── adapters ──
const adapters = {
	linkpeek: {
		// allowPrivateIPs needed only because the bench server is on localhost
		run: async (url) => (await preview(url, { allowPrivateIPs: true })).title,
		note: "preview(url, { allowPrivateIPs: true })",
	},
	"link-preview-js (E2E)": {
		// Expected to fail: since the CVE-2026-43897 fix it rejects IP-literal
		// hosts with no opt-out, so it cannot be benchmarked end-to-end locally.
		run: async (url) => (await getLinkPreview(url)).title,
		note: "getLinkPreview(url)",
	},
	"link-preview-js (fetch+parse)": {
		run: async (url) => {
			const html = await (await fetch(url)).text();
			const p = await getPreviewFromContent({
				data: html,
				headers: { "content-type": "text/html" },
				url: "https://example.com/page",
			});
			return p.title;
		},
		note: "fetch().text() + getPreviewFromContent()",
	},
	"open-graph-scraper": {
		run: async (url) => (await ogs({ url })).result.ogTitle,
		note: "ogs({ url })",
	},
	"unfurl.js": {
		run: async (url) => {
			const r = await unfurl(url);
			return r.open_graph?.title ?? r.title;
		},
		note: "unfurl(url)",
	},
	"url-metadata": {
		run: async (url) =>
			(
				await urlMetadata(url, {
					requestFilteringAgentOptions: { allowPrivateIPAddress: true },
				})
			)["og:title"],
		note: "urlMetadata(url, { allowPrivateIPAddress: true })",
	},
	"metascraper (native fetch)": {
		// metascraper does not fetch; pair it with native fetch like its docs do with got
		run: async (url) => {
			const html = await (await fetch(url)).text();
			return (await metascraper({ html, url })).title;
		},
		note: "fetch().text() + metascraper({ html, url })",
	},
};

function median(arr) {
	const sorted = [...arr].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}
function p95(arr) {
	const sorted = [...arr].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length * 0.95)];
}

const WARMUP = 5;

for (const [fixture, body] of Object.entries(corpus)) {
	const iters = body.length > 100_000 ? 40 : 150;
	const rows = [];
	for (const [name, adapter] of Object.entries(adapters)) {
		const times = [];
		let title = null;
		let failed = null;
		try {
			for (let i = 0; i < WARMUP; i++) {
				title = await adapter.run(`${base}/${fixture}?w=${i}`);
			}
			for (let i = 0; i < iters; i++) {
				const t0 = process.hrtime.bigint();
				await adapter.run(`${base}/${fixture}?i=${i}`);
				times.push(Number(process.hrtime.bigint() - t0) / 1e6);
			}
			rows.push({ name, median: median(times), p95: p95(times), title });
		} catch (err) {
			failed = err.message?.slice(0, 90) ?? String(err);
			rows.push({ name, failed });
		}
	}
	rows.sort(
		(a, b) =>
			(a.median ?? Number.POSITIVE_INFINITY) -
			(b.median ?? Number.POSITIVE_INFINITY),
	);
	console.log(
		`\n## ${fixture} (${(body.length / 1024).toFixed(1)} kB, ${iters} iterations)`,
	);
	for (const row of rows) {
		if (row.failed) {
			console.log(`  ${row.name.padEnd(30)} FAILED: ${row.failed}`);
		} else {
			console.log(
				`  ${row.name.padEnd(30)} median ${row.median.toFixed(2).padStart(7)} ms | p95 ${row.p95.toFixed(2).padStart(7)} ms | title: ${JSON.stringify(row.title)?.slice(0, 40)}`,
			);
		}
	}
}

console.log("\nNode:", process.version);
server.close();
