#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const isJson = args.has("--json");
const includeLive =
	args.has("--live") || process.env.LINKPEEK_LIVE_TESTS === "1";
const sampleCount = parsePositiveInteger(argValue("--samples")) ?? 5;

const { parseHTML, preview, presets } = await import(
	pathToFileURL(resolve(root, "dist/index.js")).href
);

const fixtures = [
	"test/fixtures/all-fields.html",
	"test/fixtures/recipe-blog.html",
	"test/fixtures/json-ld-graph.html",
	"test/fixtures/body-image-fallback.html",
];

const liveUrls = [
	"https://en.wikipedia.org/wiki/Open_Graph_protocol",
	"https://news.ycombinator.com",
	"https://www.npmjs.com/package/htmlparser2",
	"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
];

const result = {
	generatedAt: new Date().toISOString(),
	node: process.version,
	package: packageInfo(),
	parse: runParseBenchmarks(sampleCount),
	live: includeLive ? await runLiveBenchmarks() : null,
};

if (isJson) {
	console.log(JSON.stringify(result, null, 2));
} else {
	printText(result);
}

function packageInfo() {
	const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
	const pack = JSON.parse(
		execFileSync("npm", ["pack", "--dry-run", "--json"], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}),
	)[0];

	return {
		name: pkg.name,
		version: pkg.version,
		runtimeDependencies: Object.keys(pkg.dependencies ?? {}).length,
		tarballBytes: pack.size,
		unpackedBytes: pack.unpackedSize,
		fileCount: pack.entryCount,
	};
}

function runParseBenchmarks(samples) {
	return fixtures.map((fixture) => {
		const html = readFileSync(resolve(root, fixture), "utf8");
		const iterations = chooseIterations(html.length);

		for (let i = 0; i < 1000; i++) {
			parseHTML(html, "https://example.com/page", { includeBodyContent: true });
		}

		const msPerParseSamples = [];
		const totalMsSamples = [];
		for (let sample = 0; sample < samples; sample++) {
			const started = performance.now();
			for (let i = 0; i < iterations; i++) {
				parseHTML(html, "https://example.com/page", {
					includeBodyContent: true,
				});
			}
			const elapsedMs = performance.now() - started;
			totalMsSamples.push(elapsedMs);
			msPerParseSamples.push(elapsedMs / iterations);
		}

		const msStats = summarize(msPerParseSamples);
		const totalStats = summarize(totalMsSamples);

		return {
			fixture,
			bytes: Buffer.byteLength(html),
			iterations,
			samples,
			totalMs: round(totalStats.median),
			totalMsMin: round(totalStats.min),
			totalMsMax: round(totalStats.max),
			msPerParse: round(msStats.median, 4),
			msPerParseMin: round(msStats.min, 4),
			msPerParseMean: round(msStats.mean, 4),
			msPerParseMax: round(msStats.max, 4),
			parsesPerSecond: Math.round(1000 / msStats.median),
		};
	});
}

async function runLiveBenchmarks() {
	const rows = [];
	for (const url of liveUrls) {
		const started = performance.now();
		try {
			const previewResult = await preview(url, {
				...presets.fast,
				timeout: 15_000,
			});
			const statusOk =
				previewResult.statusCode >= 200 && previewResult.statusCode < 400;
			rows.push({
				url,
				ok: statusOk,
				ms: Math.round(performance.now() - started),
				statusCode: previewResult.statusCode,
				title: Boolean(previewResult.title),
				image: Boolean(previewResult.image),
			});
		} catch (error) {
			rows.push({
				url,
				ok: false,
				ms: Math.round(performance.now() - started),
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return rows;
}

function chooseIterations(bytes) {
	if (bytes > 10_000) return 10_000;
	if (bytes > 2_000) return 50_000;
	return 100_000;
}

function printText(data) {
	console.log(`${data.package.name} ${data.package.version} benchmark`);
	console.log(`Node: ${data.node}`);
	console.log(
		`Package: ${formatBytes(data.package.tarballBytes)} tarball, ${formatBytes(
			data.package.unpackedBytes,
		)} unpacked, ${data.package.runtimeDependencies} runtime dependency`,
	);
	console.log("");
	console.log("Parse benchmark");
	for (const row of data.parse) {
		console.log(
			`- ${row.fixture}: ${row.msPerParse} ms/parse median (${row.msPerParseMin}-${row.msPerParseMax} min-max), ${row.parsesPerSecond.toLocaleString()} parses/sec (${formatBytes(
				row.bytes,
			)}, ${row.samples} samples x ${row.iterations.toLocaleString()} iterations)`,
		);
	}

	if (data.live) {
		console.log("");
		console.log("Live preview benchmark");
		for (const row of data.live) {
			if (row.statusCode) {
				const state = row.ok ? "ok" : "non-2xx/3xx";
				console.log(
					`- ${row.ms} ms | ${state} status ${row.statusCode} | title=${row.title} image=${row.image} | ${row.url}`,
				);
			} else {
				console.log(`- ${row.ms} ms | ERROR ${row.error} | ${row.url}`);
			}
		}
	} else {
		console.log("");
		console.log(
			"Live preview benchmark skipped. Run with --live or LINKPEEK_LIVE_TESTS=1.",
		);
	}
}

function formatBytes(bytes) {
	if (bytes < 1000) return `${bytes} B`;
	return `${round(bytes / 1000, 1)} kB`;
}

function summarize(values) {
	const sorted = values.toSorted((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	const median =
		sorted.length % 2 === 0
			? (sorted[middle - 1] + sorted[middle]) / 2
			: sorted[middle];
	const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
	return {
		min: sorted[0],
		median,
		mean,
		max: sorted[sorted.length - 1],
	};
}

function argValue(name) {
	const prefix = `${name}=`;
	const arg = process.argv.slice(2).find((item) => item.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : null;
}

function parsePositiveInteger(value) {
	if (!value) return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function round(value, digits = 2) {
	return Number(value.toFixed(digits));
}
