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
} from "@/lib/benchmarks";

// A bar chart that is a real table: screen readers, search engines and the
// Markdown export all read the same numbers the bars show.
export function BenchmarkChart({ kind }: { kind: ChartKind }) {
	const { title, subtitle, unit, rows } = chart(kind);
	const ceiling = Math.max(...rows.map((row) => row.value));
	return (
		<figure className="not-prose my-6 rounded-xl border bg-fd-card p-5 sm:p-6">
			<figcaption className="mb-4">
				<strong className="block font-semibold text-[0.95rem] text-fd-foreground">
					{title}
				</strong>
				<span className="text-fd-muted-foreground text-sm">{subtitle}</span>
			</figcaption>
			<table className="w-full table-fixed border-collapse text-sm">
				<colgroup>
					<col className="w-[7.5rem] sm:w-[13rem]" />
					<col />
				</colgroup>
				<thead className="sr-only">
					<tr>
						<th scope="col">Package</th>
						<th scope="col">{unit}</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const self = row.name === SELF;
						return (
							<tr key={row.name}>
								<th
									scope="row"
									className={`truncate py-1.5 pr-3 text-left font-normal ${self ? "font-semibold text-fd-foreground" : "text-fd-muted-foreground"}`}
								>
									{row.name}{" "}
									<span className="hidden text-xs opacity-70 sm:inline">
										{row.version}
									</span>
								</th>
								<td className="py-1.5">
									<div className="flex items-center gap-2.5">
										<span
											aria-hidden="true"
											className={`h-3.5 shrink-0 rounded-r-[4px] ${self ? "bg-signal" : "bg-bar"}`}
											style={{
												width: `max(3px, calc((100% - 10.5rem) * ${(row.value / ceiling).toFixed(4)}))`,
											}}
										/>
										<span
											className={`shrink-0 whitespace-nowrap ${self ? "font-semibold text-fd-foreground" : "text-fd-muted-foreground"}`}
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
	);
}

export function BenchmarkHighlights() {
	return (
		<dl className="not-prose my-6 grid gap-px overflow-hidden rounded-xl border bg-fd-border sm:grid-cols-3">
			{highlights().map((item) => (
				<div
					key={item.label}
					className="flex flex-col-reverse justify-end bg-fd-card px-5 py-4"
				>
					<dt className="text-fd-muted-foreground text-sm">{item.label}</dt>
					<dd className="font-semibold text-2xl text-fd-foreground tracking-tight">
						{item.value}
					</dd>
				</div>
			))}
		</dl>
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
