#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DAY_MS = 86_400_000;
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(
	readFileSync(resolve(root, "package.json"), "utf8"),
);
const packageName = argValue("--package") || packageJson.name;
const latestCompleteDate = yesterdayUtc();
const endDate = parseEndDate(argValue("--end")) ?? latestCompleteDate;
const startDate = new Date(endDate.getTime() - 89 * DAY_MS);
const endpoint = `https://api.npmjs.org/downloads/range/${isoDay(startDate)}:${isoDay(endDate)}/${encodeURIComponent(packageName)}`;
const includeCurrentVersionMix = isoDay(endDate) === isoDay(latestCompleteDate);
const versionEndpoint = `https://api.npmjs.org/versions/${encodeURIComponent(packageName)}/last-week`;
const versionTotalEndpoint = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`;
const [payload, versionPayload, versionTotal] = await Promise.all([
	getJson(endpoint),
	includeCurrentVersionMix ? getJson(versionEndpoint) : null,
	includeCurrentVersionMix ? getJson(versionTotalEndpoint) : null,
]);
if (!Array.isArray(payload.downloads) || payload.downloads.length < 90) {
	throw new Error("npm download API returned an incomplete 90-day range");
}

const daily = payload.downloads.map((entry) => ({
	day: entry.day,
	downloads: Number(entry.downloads),
}));
const current7 = sumWindow(daily, 0, 7);
const previous7 = sumWindow(daily, 7, 7);
const current28 = sumWindow(daily, 0, 28);
const previous28 = sumWindow(daily, 28, 28);
const current90 = sumWindow(daily, 0, 90);
const versions = Object.entries(versionPayload?.downloads ?? {})
	.map(([version, downloads]) => ({
		downloads: Number(downloads),
		version,
	}))
	.sort((a, b) => b.downloads - a.downloads);
const versionDownloads = versions.reduce(
	(sum, version) => sum + version.downloads,
	0,
);
const result = {
	generatedAt: new Date().toISOString(),
	package: packageName,
	through: daily.at(-1)?.day,
	windows: {
		last7Days: comparison(current7, previous7, 7),
		last28Days: comparison(current28, previous28, 28),
		last90Days: {
			downloads: current90,
			dailyAverage: round(current90 / 90),
		},
	},
	versionWindow:
		versionTotal && versionPayload
			? {
					start: versionTotal.start,
					end: versionTotal.end,
					downloads: versionDownloads,
					versions: versions.map((entry) => ({
						...entry,
						sharePercent:
							versionDownloads === 0
								? null
								: round((entry.downloads / versionDownloads) * 100),
					})),
				}
			: null,
	note: "Registry download requests are not unique users or confirmed installations.",
};

if (process.argv.includes("--json")) {
	console.log(JSON.stringify(result, null, 2));
} else {
	console.log(`npm download scorecard: ${packageName}`);
	console.log(`Complete data through: ${result.through}`);
	printWindow("Last 7 days", result.windows.last7Days);
	printWindow("Last 28 days", result.windows.last28Days);
	console.log(
		`Last 90 days: ${current90.toLocaleString()} requests (${result.windows.last90Days.dailyAverage.toLocaleString()} per day)`,
	);
	if (result.versionWindow) {
		console.log(
			`Version mix (${result.versionWindow.start} to ${result.versionWindow.end}):`,
		);
		for (const version of result.versionWindow.versions) {
			console.log(
				`  ${version.version}: ${version.downloads.toLocaleString()} requests (${version.sharePercent ?? "n/a"}%)`,
			);
		}
	} else {
		console.log(
			"Version mix: unavailable for historical --end dates (npm exposes only the current last-week mix)",
		);
	}
	console.log(result.note);
}

async function getJson(url) {
	const response = await fetch(url, {
		headers: { Accept: "application/json" },
	});
	if (!response.ok) {
		throw new Error(`npm download API returned ${response.status} for ${url}`);
	}
	return response.json();
}

function sumWindow(entries, offsetFromEnd, days) {
	const end = entries.length - offsetFromEnd;
	const start = end - days;
	return entries
		.slice(start, end)
		.reduce((sum, entry) => sum + entry.downloads, 0);
}

function comparison(current, previous, days) {
	const change = current - previous;
	return {
		downloads: current,
		previousDownloads: previous,
		change,
		changePercent: previous === 0 ? null : round((change / previous) * 100),
		dailyAverage: round(current / days),
	};
}

function printWindow(label, window) {
	const percent =
		window.changePercent === null
			? "n/a"
			: `${window.changePercent >= 0 ? "+" : ""}${window.changePercent}%`;
	console.log(
		`${label}: ${window.downloads.toLocaleString()} requests (${percent} vs previous period, ${window.dailyAverage.toLocaleString()} per day)`,
	);
}

function parseEndDate(value) {
	if (!value) return null;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new Error("--end must use YYYY-MM-DD");
	}
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || isoDay(date) !== value) {
		throw new Error("--end must be a valid calendar date");
	}
	return date;
}

function yesterdayUtc() {
	const now = new Date();
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
	);
}

function isoDay(date) {
	return date.toISOString().slice(0, 10);
}

function argValue(name) {
	const prefix = `${name}=`;
	const argument = process.argv
		.slice(2)
		.find((value) => value.startsWith(prefix));
	return argument?.slice(prefix.length) ?? null;
}

function round(value) {
	return Number(value.toFixed(1));
}
