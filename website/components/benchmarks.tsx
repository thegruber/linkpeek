import type React from "react";
import { Reveal } from "@/components/reveal";
import {
	benchmarkDate,
	benchmarkEnvironment,
	benchmarkMethod,
	benchmarkNotes,
	benchmarkVersions,
	type ChartKind,
	chart,
	highlights,
	SELF,
	versionOf,
	versus,
} from "@/lib/benchmarks";

// A bar chart that is a real table: screen readers, search engines and the
// Markdown export all read the same numbers the bars show.
export function BenchmarkChart({ kind }: { kind: ChartKind }) {
	const { title, subtitle, unit, rows } = chart(kind);
	const ceiling = Math.max(...rows.map((row) => row.value));
	return (
		<Reveal className="not-prose my-6">
			<figure className="m-0 border border-rule bg-fd-background">
				<figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-rule border-b px-5 py-4">
					<strong className="font-medium text-[0.95rem] text-fd-foreground tracking-tight">
						{title}
					</strong>
					<span className="font-mono text-fd-muted-foreground text-xs">
						{subtitle}
					</span>
				</figcaption>
				<table className="figures w-full table-fixed border-collapse text-sm">
					<colgroup>
						<col className="w-[8rem] sm:w-[14rem]" />
						<col />
					</colgroup>
					<thead className="sr-only">
						<tr>
							<th scope="col">Package</th>
							<th scope="col">{unit}</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => {
							const self = row.name === SELF;
							return (
								<tr
									key={row.name}
									className="border-rule border-b last:border-b-0"
								>
									<th
										scope="row"
										className={`truncate border-rule border-r px-5 py-2.5 text-left font-normal ${self ? "font-medium text-fd-foreground" : "text-fd-muted-foreground"}`}
									>
										{row.name}{" "}
										<span className="hidden font-mono text-[0.7rem] opacity-70 sm:inline">
											{row.version}
										</span>
									</th>
									<td className="px-4 py-2.5">
										<div className="flex items-center gap-3">
											<span
												aria-hidden="true"
												className={`bar h-3 shrink-0 ${self ? "bg-signal" : "bg-bar"}`}
												style={
													{
														"--i": index,
														width: `max(2px, calc((100% - 10.5rem) * ${(row.value / ceiling).toFixed(4)}))`,
													} as React.CSSProperties
												}
											/>
											<span
												className={`shrink-0 whitespace-nowrap font-mono text-[0.8rem] ${self ? "font-medium text-fd-foreground" : "text-fd-muted-foreground"}`}
											>
												{row.label}
											</span>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</figure>
		</Reveal>
	);
}

export function BenchmarkHighlights() {
	return (
		<dl className="not-prose my-6 grid border-rule border-t border-l sm:grid-cols-3">
			{highlights().map((item) => (
				<div
					key={item.label}
					className="flex flex-col-reverse justify-end border-rule border-r border-b px-5 py-5"
				>
					<dt className="mt-2 text-fd-muted-foreground text-sm">
						{item.label}
					</dt>
					<dd className="figures font-normal text-[2.5rem] text-fd-foreground leading-none tracking-[-0.04em]">
						{item.value}
					</dd>
				</div>
			))}
		</dl>
	);
}

export function VersusTable({ other }: { other: string }) {
	const rows = versus(other);
	return (
		<div className="not-prose my-6 overflow-x-auto border border-rule">
			<table className="figures w-full border-collapse text-sm">
				<caption className="border-rule border-b px-4 py-3 text-left font-mono text-fd-muted-foreground text-xs">
					Same corpus, same local server, measured on {benchmarkDate}
				</caption>
				<thead>
					<tr className="border-rule border-b text-left">
						<th
							scope="col"
							className="px-4 py-2.5 font-normal text-fd-muted-foreground"
						>
							Metric
						</th>
						<th scope="col" className="px-4 py-2.5 font-medium">
							linkpeek {versionOf(SELF)}
						</th>
						<th scope="col" className="px-4 py-2.5 font-normal">
							{other} {versionOf(other)}
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr
							key={row.metric}
							className="border-rule border-b last:border-b-0"
						>
							<th
								scope="row"
								className="px-4 py-2.5 text-left font-normal text-fd-muted-foreground"
							>
								{row.metric}
							</th>
							<td
								className={`px-4 py-2.5 font-mono ${row.selfWins ? "text-signal-text" : ""}`}
							>
								{row.self}
							</td>
							<td
								className={`px-4 py-2.5 font-mono ${row.selfWins ? "" : "text-signal-text"}`}
							>
								{row.other}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function BenchmarkDate() {
	return <>{benchmarkDate}</>;
}

export function BenchmarkMethod() {
	return (
		<>
			<p>
				The packages run on a local server, so these numbers isolate library
				overhead; they do not predict latency against real websites.{" "}
				{benchmarkMethod}
			</p>
			<p>
				Environment: {benchmarkEnvironment}. Versions:{" "}
				{benchmarkVersions.map((item, index) => (
					<span key={item.name}>
						{index > 0 && ", "}
						<code>
							{item.name}@{item.version}
						</code>
					</span>
				))}
				.
			</p>
			<ul>
				{benchmarkNotes.map(([name, note]) => (
					<li key={name}>
						<code>{name}</code>: {note}
					</li>
				))}
			</ul>
		</>
	);
}
