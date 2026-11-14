import {
	downloadsEndpoint,
	parseDownloads,
	summarizeDownloads,
	type WeeklyDownloads,
} from "./downloads-data.js";

// A small sparkline of weekly npm downloads. It is decoration next to the
// numbers, so it has no axes or tooltip, and the whole strip stays hidden when
// the API is unavailable.
const SVG = "http://www.w3.org/2000/svg";
const WIDTH = 132;
const HEIGHT = 32;
const INSET = 3;
const full = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

const root = document.querySelector<HTMLElement>("[data-downloads]");
if (root) void load(root);

async function load(container: HTMLElement) {
	try {
		const response = await fetch(
			downloadsEndpoint(container.dataset.downloads || "linkpeek"),
		);
		if (!response.ok) return;
		const summary = summarizeDownloads(parseDownloads(await response.json()));
		if (summary.weeks.length < 2) return;
		const set = (name: string, text: string) => {
			const element = container.querySelector(`[data-${name}]`);
			if (element) element.textContent = text;
		};
		set("week", full.format(summary.last7Days));
		set(
			"total",
			`${compact.format(summary.total)} ${summary.sinceLaunch ? "since launch" : "in the past year"}`,
		);
		container
			.querySelector("[data-spark]")
			?.replaceChildren(sparkline(summary.weeks));
		container.hidden = false;
	} catch {
		// Leave the strip hidden; the npm link in the header still works.
	}
}

function sparkline(weeks: WeeklyDownloads[]) {
	const max = Math.max(...weeks.map((week) => week.downloads), 1);
	const x = (index: number) =>
		INSET + (index / (weeks.length - 1)) * (WIDTH - INSET * 2);
	const y = (value: number) =>
		HEIGHT - INSET - (value / max) * (HEIGHT - INSET * 2);
	const points = weeks.map((week, index) => `${x(index)},${y(week.downloads)}`);
	const last = weeks.length - 1;
	const svg = svgElement("svg", {
		width: WIDTH,
		height: HEIGHT,
		viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
		preserveAspectRatio: "none",
		"aria-hidden": "true",
		focusable: "false",
	});
	svg.append(
		svgElement("path", {
			class: "spark-area",
			d: `M${x(0)},${HEIGHT}L${points.join("L")}L${x(last)},${HEIGHT}Z`,
		}),
		svgElement("path", { class: "spark-line", d: `M${points.join("L")}` }),
		svgElement("circle", {
			class: "spark-dot",
			cx: x(last),
			cy: y(weeks[last].downloads),
			r: 2.5,
		}),
	);
	return svg;
}

function svgElement(name: string, attrs: Record<string, string | number>) {
	const element = document.createElementNS(SVG, name);
	for (const [key, value] of Object.entries(attrs)) {
		element.setAttribute(key, String(value));
	}
	return element;
}
