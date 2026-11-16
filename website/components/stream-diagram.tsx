import { PeekingEyes } from "@/components/gaze";
import type { ShowcaseCard } from "@/lib/showcase";

// One real page from the build drawn to scale: the <head> linkpeek reads,
// the cut at </head>, and the body it never downloads or parses.
export function StreamDiagram({ page }: { page: ShowcaseCard }) {
	const share = page.headBytes / page.pageBytes;
	const width = `${Math.max(1.5, share * 100).toFixed(2)}%`;
	const body = page.pageBytes - page.headBytes;
	return (
		<figure className="m-0 border border-rule bg-fd-background">
			<figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-rule border-b px-5 py-4">
				<strong className="font-medium tracking-tight">
					{page.host}, fetched when this site was built
				</strong>
				<span className="font-mono text-fd-muted-foreground text-xs">
					{kb(page.pageBytes)} of HTML
				</span>
			</figcaption>
			<div className="px-5 pt-16 pb-6">
				<div className="relative h-12">
					<div
						aria-hidden="true"
						className="halftone absolute inset-0 text-fd-muted-foreground/45 [--dot:1.6px] [--pitch:8px]"
					/>
					<div
						className="absolute inset-y-0 left-0 bg-mark"
						style={{ width }}
						aria-hidden="true"
					/>
					<div
						className="absolute inset-y-[-10px] w-0.5 bg-fd-foreground"
						style={{ left: width }}
						aria-hidden="true"
					/>
					<PeekingEyes
						outline="var(--color-ink)"
						className="absolute bottom-full w-14 -translate-x-1/2 translate-y-[1px]"
						style={{ left: width }}
					/>
				</div>
				<div className="mt-4 grid gap-4 font-mono text-xs sm:grid-cols-[auto_1fr]">
					<p>
						<span className="bg-mark px-1 text-mark-ink">
							&lt;head&gt; {kb(page.headBytes)}
						</span>
						<span className="text-fd-muted-foreground">
							{" "}
							read, then the stream is cancelled
						</span>
					</p>
					<p className="text-fd-muted-foreground sm:text-right">
						body {kb(body)}: never downloaded or parsed
					</p>
				</div>
			</div>
		</figure>
	);
}

function kb(bytes: number): string {
	return bytes < 100_000
		? `${(bytes / 1000).toFixed(1)} kB`
		: `${Math.round(bytes / 1000)} kB`;
}
