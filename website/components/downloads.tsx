"use client";
import { useEffect, useState } from "react";
import { RollingFigure } from "@/components/motion-text";
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

interface State {
	week: number;
	total: number;
	sinceLaunch: boolean;
	weeks: WeeklyDownloads[];
}

// Weekly npm downloads with a tiny sparkline, live from the npm API. It
// stays hidden when the API cannot be reached.
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
	if (!state) return null;
	return (
		<a
			href={npmUrl}
			className="inline-flex items-center gap-2 hover:text-fd-foreground"
		>
			<Sparkline weeks={state.weeks} />
			<span>
				<RollingFigure value={state.week} /> weekly downloads
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
			className="h-4 w-12 shrink-0"
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
