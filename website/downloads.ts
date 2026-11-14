import {
	type DownloadSummary,
	downloadsEndpoint,
	niceMaximum,
	parseDownloads,
	summarizeDownloads,
	type WeeklyDownloads,
} from "./downloads-data.js";

const SVG = "http://www.w3.org/2000/svg";
const HEIGHT = 220;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };
const full = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});
const shortDate = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	timeZone: "UTC",
});
const monthOnly = new Intl.DateTimeFormat("en", {
	month: "short",
	timeZone: "UTC",
});

const root = document.querySelector<HTMLElement>("[data-downloads]");
if (root) void load(root);

async function load(container: HTMLElement) {
	const status = container.querySelector<HTMLElement>("[data-status]");
	try {
		const response = await fetch(
			downloadsEndpoint(container.dataset.downloads || "linkpeek"),
		);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const summary = summarizeDownloads(parseDownloads(await response.json()));
		if (!summary.weeks.length) throw new Error("No downloads yet");
		renderStats(container, summary);
		renderTable(container, summary.weeks);
		const chart = container.querySelector<HTMLElement>("[data-chart]");
		if (chart) {
			const draw = () => renderChart(chart, summary.weeks);
			draw();
			new ResizeObserver(draw).observe(chart);
		}
		container.dataset.state = "ready";
		if (status) {
			status.textContent = `Weekly totals through ${shortDate.format(new Date(summary.through))}, ${summary.through.slice(0, 4)}.`;
		}
	} catch {
		container.dataset.state = "error";
		if (status) {
			status.textContent =
				"Download data could not be loaded. The npm page shows current numbers.";
		}
	}
}

function renderStats(container: HTMLElement, summary: DownloadSummary) {
	const values: Record<string, string> = {
		week: full.format(summary.last7Days),
		month: full.format(summary.last30Days),
		year: full.format(summary.total),
	};
	for (const element of container.querySelectorAll<HTMLElement>(
		"[data-stat]",
	)) {
		element.textContent = values[element.dataset.stat ?? ""] ?? "–";
	}
	const change = container.querySelector<HTMLElement>("[data-change]");
	if (change && summary.previous7Days > 0) {
		const percent = Math.round(
			((summary.last7Days - summary.previous7Days) / summary.previous7Days) *
				100,
		);
		change.textContent = `${percent >= 0 ? "+" : "−"}${Math.abs(percent)}% vs previous week`;
	}
}

function renderTable(container: HTMLElement, weeks: WeeklyDownloads[]) {
	const body = container.querySelector<HTMLElement>("[data-table] tbody");
	if (!body) return;
	body.replaceChildren(
		...weeks
			.slice()
			.reverse()
			.map((week) => {
				const row = document.createElement("tr");
				const label = document.createElement("td");
				label.textContent = weekLabel(week);
				const value = document.createElement("td");
				value.textContent = full.format(week.downloads);
				row.append(label, value);
				return row;
			}),
	);
}

function renderChart(chart: HTMLElement, weeks: WeeklyDownloads[]) {
	const width = Math.max(280, Math.floor(chart.clientWidth));
	const plotWidth = width - PAD.left - PAD.right;
	const plotHeight = HEIGHT - PAD.top - PAD.bottom;
	const max = niceMaximum(Math.max(...weeks.map((week) => week.downloads)));
	const x = (index: number) =>
		PAD.left +
		(weeks.length === 1
			? plotWidth / 2
			: (index / (weeks.length - 1)) * plotWidth);
	const y = (value: number) =>
		PAD.top + plotHeight - (value / max) * plotHeight;

	const svg = svgElement("svg", {
		width,
		height: HEIGHT,
		viewBox: `0 0 ${width} ${HEIGHT}`,
		role: "img",
		"aria-label": `Weekly npm downloads, ${weekLabel(weeks[0])} to ${weekLabel(weeks.at(-1) as WeeklyDownloads)}. Peak ${full.format(Math.max(...weeks.map((week) => week.downloads)))} per week.`,
	});

	for (const tick of [0, max / 2, max]) {
		const ty = y(tick);
		svg.append(
			svgElement("line", {
				class: tick === 0 ? "chart-baseline" : "chart-grid",
				x1: PAD.left,
				x2: width - PAD.right,
				y1: ty,
				y2: ty,
			}),
			svgText(compact.format(tick), PAD.left - 8, ty + 4, "end"),
		);
	}

	let lastLabelX = Number.NEGATIVE_INFINITY;
	weeks.forEach((week, index) => {
		const month = week.end.slice(0, 7);
		if (index > 0 && weeks[index - 1].end.slice(0, 7) === month) return;
		const lx = x(index);
		if (lx - lastLabelX < 44 || lx > width - PAD.right - 12) return;
		lastLabelX = lx;
		svg.append(
			svgText(monthOnly.format(new Date(week.end)), lx, HEIGHT - 8, "middle"),
		);
	});

	const points = weeks.map((week, index) => `${x(index)},${y(week.downloads)}`);
	svg.append(
		svgElement("path", {
			class: "chart-area",
			d: `M${x(0)},${y(0)}L${points.join("L")}L${x(weeks.length - 1)},${y(0)}Z`,
		}),
		svgElement("path", { class: "chart-line", d: `M${points.join("L")}` }),
	);

	const last = weeks.length - 1;
	const endDot = svgElement("circle", {
		class: "chart-dot",
		cx: x(last),
		cy: y(weeks[last].downloads),
		r: 4,
	});
	const crosshair = svgElement("line", {
		class: "chart-crosshair",
		y1: PAD.top,
		y2: PAD.top + plotHeight,
		visibility: "hidden",
	});
	const focusDot = svgElement("circle", {
		class: "chart-dot",
		r: 4,
		visibility: "hidden",
	});
	svg.append(crosshair, endDot, focusDot);
	let active = last;

	const tooltip = document.createElement("div");
	tooltip.className = "chart-tooltip";
	tooltip.hidden = true;
	const tooltipValue = document.createElement("strong");
	const tooltipLabel = document.createElement("span");
	tooltip.append(tooltipValue, tooltipLabel);

	const show = (index: number) => {
		const week = weeks[index];
		const px = x(index);
		const py = y(week.downloads);
		for (const [element, attrs] of [
			[crosshair, { x1: px, x2: px }],
			[focusDot, { cx: px, cy: py }],
		] as const) {
			for (const [key, value] of Object.entries(attrs)) {
				element.setAttribute(key, String(value));
			}
			element.setAttribute("visibility", "visible");
		}
		tooltipValue.textContent = full.format(week.downloads);
		tooltipLabel.textContent = weekLabel(week);
		tooltip.hidden = false;
		const left = Math.min(Math.max(px, 70), width - 70);
		tooltip.style.transform = `translate(calc(${left}px - 50%), ${Math.max(py - 64, 0)}px)`;
		active = index;
	};
	const hide = () => {
		crosshair.setAttribute("visibility", "hidden");
		focusDot.setAttribute("visibility", "hidden");
		tooltip.hidden = true;
	};

	const surface = document.createElement("div");
	surface.className = "chart-surface";
	surface.tabIndex = 0;
	surface.setAttribute("role", "group");
	surface.setAttribute(
		"aria-label",
		"Weekly downloads chart. Use the left and right arrow keys to read each week.",
	);
	surface.append(svg, tooltip);
	surface.addEventListener("pointermove", (event) => {
		const bounds = svg.getBoundingClientRect();
		const ratio = (event.clientX - bounds.left - PAD.left) / plotWidth;
		show(Math.round(Math.min(Math.max(ratio, 0), 1) * last));
	});
	surface.addEventListener("pointerleave", hide);
	surface.addEventListener("focus", () => show(active));
	surface.addEventListener("blur", hide);
	surface.addEventListener("keydown", (event) => {
		const next =
			event.key === "ArrowLeft"
				? active - 1
				: event.key === "ArrowRight"
					? active + 1
					: event.key === "Home"
						? 0
						: event.key === "End"
							? last
							: null;
		if (next === null) return;
		event.preventDefault();
		show(Math.min(Math.max(next, 0), last));
	});
	chart.replaceChildren(surface);
}

function weekLabel(week: WeeklyDownloads): string {
	return `${shortDate.format(new Date(week.start))} – ${shortDate.format(new Date(week.end))}`;
}

function svgText(
	text: string,
	tx: number,
	ty: number,
	anchor: "start" | "middle" | "end",
) {
	const element = svgElement("text", {
		class: "chart-label",
		x: tx,
		y: ty,
		"text-anchor": anchor,
	});
	element.textContent = text;
	return element;
}

function svgElement(name: string, attrs: Record<string, string | number>) {
	const element = document.createElementNS(SVG, name);
	for (const [key, value] of Object.entries(attrs)) {
		element.setAttribute(key, String(value));
	}
	return element;
}
