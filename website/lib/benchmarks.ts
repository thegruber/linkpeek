// Dated benchmark results, rendered by the charts and the Markdown exports.
// Every number on the site comes from data/benchmarks.json, which is written
// from the competitive harness in benchmarks/competitive.
import data from "@/data/benchmarks.json";

export const SELF = "linkpeek";

export interface ChartRow {
	name: string;
	version: string;
	value: number;
	label: string;
}

export interface Chart {
	title: string;
	subtitle: string;
	unit: string;
	rows: ChartRow[];
}

export type ChartKind = "large" | "small" | "install";

type MedianMs = Record<string, number>;
const fixtures = data.fixtures as { bytes: number; medianMs: MedianMs }[];
const small = fixtures.filter((fixture) => fixture.bytes < 100_000);
const large = fixtures.find((fixture) => fixture.bytes >= 100_000);
if (!large) throw new Error("benchmarks.json needs a large-page fixture");
const largePage = large;
const versions = data.versions as Record<string, string>;
const names = Object.keys(versions);
const smallMeans = Object.fromEntries(
	names.map((name) => [
		name,
		small.reduce((sum, fixture) => sum + fixture.medianMs[name], 0) /
			small.length,
	]),
);
const smallRange = `${formatKB(Math.min(...small.map((f) => f.bytes)))}–${formatKB(Math.max(...small.map((f) => f.bytes)))}`;

export const benchmarkDate = formatDate(data.date);
export const benchmarkMethod = data.method;
export const benchmarkEnvironment = `${data.environment.platform}, Node.js ${data.environment.node}, npm ${data.environment.npm}`;
export const benchmarkVersions = names.map((name) => ({
	name,
	version: versions[name],
}));
export const benchmarkNotes = Object.entries(
	data.notes as Record<string, string>,
);

export function chart(kind: ChartKind): Chart {
	if (kind === "install") {
		return {
			title: "Clean install size",
			subtitle: data.install.note,
			unit: "node_modules",
			rows: sorted(
				data.install.packages.map((entry) => ({
					name: entry.name,
					version: versions[entry.name],
					value: entry.nodeModulesKiB,
					label: `${formatMiB(entry.nodeModulesKiB)} · ${entry.installedPackages} packages`,
				})),
			),
		};
	}
	const values = kind === "large" ? largePage.medianMs : smallMeans;
	return {
		title:
			kind === "large"
				? `${formatKB(largePage.bytes)} page with a normal head`
				: `Small pages (${smallRange})`,
		subtitle:
			kind === "large"
				? "Median milliseconds per end-to-end preview. Shorter is faster."
				: `Mean of the medians for ${small.length} fixtures. Shorter is faster.`,
		unit: "Median",
		rows: sorted(
			names.map((name) => ({
				name,
				version: versions[name],
				value: values[name],
				label: formatMs(values[name]),
			})),
		),
	};
}

export interface Highlight {
	label: string;
	value: string;
	/** The number in `value`, so it can be animated, and what follows it. */
	figure: number;
	decimals: number;
	suffix: string;
}

// Ratios against the closest competitor. When linkpeek stops leading a
// metric, the highlight falls back to the absolute value rather than
// printing a misleading ratio.
export function highlights(): Highlight[] {
	const others = (values: Record<string, number>) =>
		Object.entries(values).filter(([name]) => name !== SELF);
	const own = largePage.medianMs[SELF];
	const fastest = Math.min(...others(largePage.medianMs).map(([, v]) => v));
	const sizes = Object.fromEntries(
		data.install.packages.map((entry) => [entry.name, entry.nodeModulesKiB]),
	);
	const smallest = Math.min(...others(sizes).map(([, v]) => v));
	const page = `${formatKB(largePage.bytes)} page`;
	return [
		own < fastest
			? ratio(`${page}, vs the next-fastest package`, fastest / own, "faster")
			: figure(`${page}, median`, own, 2, " ms"),
		sizes[SELF] < smallest
			? ratio(
					"Install size, vs the next-smallest package",
					smallest / sizes[SELF],
					"smaller",
				)
			: figure("Install size", sizes[SELF] / 1024, 1, " MB"),
		figure("Runtime dependencies", 1, 0, ""),
	];
}

/** Markdown version of a chart, for llms.txt and the per-page exports. */
export function chartMarkdown(kind: ChartKind): string {
	const { title, subtitle, unit, rows } = chart(kind);
	return [
		`**${title}.** ${subtitle}`,
		"",
		`| Package | ${unit} |`,
		"| --- | ---: |",
		...rows.map(
			(row) =>
				`| ${row.name === SELF ? `**${row.name}**` : row.name} ${row.version} | ${row.label} |`,
		),
	].join("\n");
}

export function highlightsMarkdown(): string {
	return highlights()
		.map((item) => `- ${item.label}: **${item.value}**`)
		.join("\n");
}

function sorted(rows: ChartRow[]): ChartRow[] {
	return rows.slice().sort((a, b) => a.value - b.value);
}

export function formatMs(value: number): string {
	return `${value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : Math.round(value)} ms`;
}

function ratio(label: string, value: number, word: string): Highlight {
	const decimals = value < 10 ? 1 : 0;
	return {
		label,
		value: `${formatRatio(value)} ${word}`,
		figure: Number(value.toFixed(decimals)),
		decimals,
		suffix: `× ${word}`,
	};
}

function figure(
	label: string,
	value: number,
	decimals: number,
	suffix: string,
): Highlight {
	return {
		label,
		value: `${value.toFixed(decimals)}${suffix}`,
		figure: Number(value.toFixed(decimals)),
		decimals,
		suffix,
	};
}

function formatRatio(ratio: number): string {
	return `${ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}×`;
}

function formatKB(bytes: number): string {
	return bytes >= 10_000
		? `${Math.floor(bytes / 1000)} kB`
		: `${(bytes / 1000).toFixed(1)} kB`;
}

function formatMiB(kib: number): string {
	return `${(kib / 1024).toFixed(1)} MB`;
}

function formatDate(day: string): string {
	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${day}T00:00:00Z`));
}
