"use client";
import { useEffect, useState } from "react";
import {
	downloadsEndpoint,
	parseDownloads,
	summarizeDownloads,
	type WeeklyDownloads,
} from "@/lib/downloads-data";
import { npmUrl } from "@/lib/shared";

const WIDTH = 132;
const HEIGHT = 32;
const INSET = 3;
const full = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", {
	notation: "compact",
	maximumFractionDigits: 1,
});

interface State {
	week: number;
	total: number;
	sinceLaunch: boolean;
	weeks: WeeklyDownloads[];
}

// Weekly npm downloads as a stat cell with a small sparkline. The number is
// live from the npm API; without it the cell shows a dash.
export function Downloads() {
	const [state, setState] = useState<State | null>(null);
	useEffect(() => {
		const controller = new AbortController();
		fetch(downloadsEndpoint("linkpeek"), { signal: controller.signal })
			.then((response) => (response.ok ? response.json() : null))
			.then((payload) => {
				if (!payload) return;
				const summary = summarizeDownloads(parseDownloads(payload));
				if (summary.weeks.length < 2) return;
				setState({
					week: summary.last7Days,
					total: summary.total,
					sinceLaunch: summary.sinceLaunch,
					weeks: summary.weeks,
				});
			})
			.catch(() => {});
		return () => controller.abort();
	}, []);
	return (
		<a
			href={npmUrl}
			className="group flex h-full flex-col justify-between gap-6 px-5 py-6 transition-colors hover:bg-fd-card"
		>
			<span className="figures block font-normal text-[clamp(2.5rem,4vw,3.75rem)] leading-none tracking-[-0.045em]">
				{state ? full.format(state.week) : "—"}
			</span>
			<span className="flex items-end justify-between gap-4">
				<span className="text-fd-muted-foreground text-sm">
					npm downloads last week
					{state && (
						<span className="block font-mono text-xs">
							{compact.format(state.total)}{" "}
							{state.sinceLaunch ? "since launch" : "in the past year"}
						</span>
					)}
				</span>
				{state && <Sparkline weeks={state.weeks} />}
			</span>
		</a>
	);
}

function Sparkline({ weeks }: { weeks: WeeklyDownloads[] }) {
	const max = Math.max(...weeks.map((week) => week.downloads), 1);
	const x = (index: number) =>
		INSET + (index / (weeks.length - 1)) * (WIDTH - INSET * 2);
	const y = (value: number) =>
		HEIGHT - INSET - (value / max) * (HEIGHT - INSET * 2);
	const points = weeks.map((week, index) => `${x(index)},${y(week.downloads)}`);
	const last = weeks.length - 1;
	return (
		<svg
			width={WIDTH}
			height={HEIGHT}
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			aria-hidden="true"
			className="h-10 w-28 shrink-0"
			preserveAspectRatio="none"
		>
			<path
				d={`M${x(0)},${HEIGHT}L${points.join("L")}L${x(last)},${HEIGHT}Z`}
				className="fill-signal-wash"
			/>
			<path
				d={`M${points.join("L")}`}
				className="fill-none stroke-signal"
				strokeWidth={1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	);
}
