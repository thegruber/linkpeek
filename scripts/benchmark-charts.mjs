// Renders the dated benchmark data as static, script-free bar charts. Each
// chart is a real table, so screen readers and the Markdown export receive the
// same numbers that the bars show.

const SELF = "linkpeek";

export function benchmarkContent(data) {
	const small = data.fixtures.filter((fixture) => fixture.bytes < 100_000);
	const large = data.fixtures.find((fixture) => fixture.bytes >= 100_000);
	const names = Object.keys(data.versions);
	const smallMeans = Object.fromEntries(
		names.map((name) => [
			name,
			small.reduce((sum, fixture) => sum + fixture.medianMs[name], 0) /
				small.length,
		]),
	);
	const largest = Math.max(
		...data.install.packages.map((entry) => entry.nodeModulesKiB),
	);
	const smallRange = `${formatKB(Math.min(...small.map((f) => f.bytes)))}–${formatKB(Math.max(...small.map((f) => f.bytes)))}`;
	return {
		"benchmark:date": formatDate(data.date),
		"benchmark:summary": highlights(data, large),
		"benchmark:large": barChart({
			title: `${formatKB(large.bytes)} page with a normal head`,
			subtitle:
				"Median milliseconds per end-to-end preview. Shorter is faster.",
			unit: "Median",
			rows: names.map((name) => ({
				name,
				version: data.versions[name],
				value: large.medianMs[name],
				label: formatMs(large.medianMs[name]),
			})),
		}),
		"benchmark:small": barChart({
			title: `Small pages (${smallRange})`,
			subtitle: `Mean of the medians for ${small.length} fixtures. Shorter is faster.`,
			unit: "Median",
			rows: names.map((name) => ({
				name,
				version: data.versions[name],
				value: smallMeans[name],
				label: formatMs(smallMeans[name]),
			})),
		}),
		"benchmark:install": barChart({
			title: "Clean install size",
			subtitle: data.install.note,
			unit: "node_modules",
			rows: data.install.packages.map((entry) => ({
				name: entry.name,
				version: data.versions[entry.name],
				value: entry.nodeModulesKiB,
				label: `${formatMiB(entry.nodeModulesKiB)} · ${entry.installedPackages} packages`,
			})),
			max: largest,
		}),
		"benchmark:environment": `${escapeHtml(data.environment.platform)}, Node.js ${escapeHtml(data.environment.node)}, npm ${escapeHtml(data.environment.npm)}`,
		"benchmark:method": escapeHtml(data.method),
		"benchmark:versions": names
			.map(
				(name) =>
					`<code>${escapeHtml(name)}@${escapeHtml(data.versions[name])}</code>`,
			)
			.join(", "),
		"benchmark:notes": Object.entries(data.notes)
			.map(
				([name, note]) =>
					`<li><code>${escapeHtml(name)}</code>: ${escapeHtml(note)}</li>`,
			)
			.join(""),
	};
}

// Headline ratios against the closest competitor. If linkpeek ever stops
// leading a metric, the stat falls back to its absolute value instead of
// printing a misleading ratio.
function highlights(data, large) {
	const others = (values) =>
		Object.entries(values).filter(([name]) => name !== SELF);
	const fastest = Math.min(...others(large.medianMs).map(([, value]) => value));
	const own = large.medianMs[SELF];
	const sizes = Object.fromEntries(
		data.install.packages.map((entry) => [entry.name, entry.nodeModulesKiB]),
	);
	const smallest = Math.min(...others(sizes).map(([, value]) => value));
	const page = `${formatKB(large.bytes)} page`;
	const stats = [
		own < fastest
			? [
					`${page}, vs the next-fastest package`,
					`${formatRatio(fastest / own)} faster`,
				]
			: [`${page}, median`, formatMs(own)],
		sizes[SELF] < smallest
			? [
					"Install size, vs the next-smallest package",
					`${formatRatio(smallest / sizes[SELF])} smaller`,
				]
			: ["Install size", formatMiB(sizes[SELF])],
		["Runtime dependencies", "1"],
	];
	return `<dl class="stat-row">${stats
		.map(
			([label, value]) =>
				`<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`,
		)
		.join("")}</dl>`;
}

function formatRatio(ratio) {
	return `${ratio < 10 ? ratio.toFixed(1) : Math.round(ratio)}×`;
}

function barChart({ title, subtitle, unit, rows, max }) {
	const sorted = rows.slice().sort((a, b) => a.value - b.value);
	const ceiling = max ?? Math.max(...sorted.map((row) => row.value));
	return `<figure class="bar-chart">
	<figcaption><strong>${escapeHtml(title)}</strong> <span>${escapeHtml(subtitle)}</span></figcaption>
	<table>
		<colgroup><col class="bar-label" /><col /></colgroup>
		<thead class="sr-only"><tr><th scope="col">Package</th><th scope="col">${escapeHtml(unit)}</th></tr></thead>
		<tbody>${sorted
			.map(
				(row) =>
					`<tr${row.name === SELF ? ' class="is-self"' : ""}><th scope="row">${escapeHtml(row.name)} <span>${escapeHtml(row.version)}</span></th><td><span class="bar" style="--value: ${(row.value / ceiling).toFixed(4)}" aria-hidden="true"></span><span class="bar-value">${escapeHtml(row.label)}</span></td></tr>`,
			)
			.join("")}</tbody>
	</table>
</figure>`;
}

function formatMs(value) {
	return `${value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : Math.round(value)} ms`;
}

function formatKB(bytes) {
	return bytes >= 10_000
		? `${Math.floor(bytes / 1000)} kB`
		: `${(bytes / 1000).toFixed(1)} kB`;
}

function formatMiB(kib) {
	return `${(kib / 1024).toFixed(1)} MB`;
}

function formatDate(day) {
	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(new Date(`${day}T00:00:00Z`));
}

function escapeHtml(value) {
	return String(value)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}
