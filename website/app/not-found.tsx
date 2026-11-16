import type { Metadata } from "next";
import Link from "next/link";
import { Mark } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
	title: "Page not found",
	description: "This linkpeek page does not exist.",
	robots: { index: false, follow: true },
};

export default function NotFound() {
	return (
		<>
			<SiteHeader />
			<main className="grid flex-1 lg:grid-cols-2">
				<div className="flex flex-col justify-between gap-10 border-ink px-5 py-12 sm:px-8 lg:border-r lg:py-16">
					<p className="font-mono text-[0.72rem] uppercase tracking-[0.06em]">
						HTTP 404
					</p>
					<h1 className="text-balance font-normal text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.045em]">
						Nothing to peek at here.
					</h1>
				</div>
				<div className="flex flex-col justify-between gap-10 border-ink border-t px-5 py-12 sm:px-8 lg:border-t-0 lg:py-16">
					<Mark className="size-24" />
					<div className="grid gap-4">
						<p className="text-fd-muted-foreground">
							This page does not exist. The documentation starts at the quick
							start.
						</p>
						<div className="grid grid-cols-2">
							<Link
								href="/quick-start/"
								className="press flex min-h-12 items-center bg-ink px-4 font-mono text-[0.72rem] text-white uppercase tracking-[0.06em] transition-[background-color,color,transform] hover:bg-mark hover:text-ink"
							>
								Quick start
							</Link>
							<Link
								href="/"
								className="press flex min-h-12 items-center border border-ink border-l-0 px-4 font-mono text-[0.72rem] uppercase tracking-[0.06em] transition-[background-color,transform] hover:bg-block"
							>
								Home
							</Link>
						</div>
					</div>
				</div>
			</main>
		</>
	);
}
