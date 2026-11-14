"use client";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import Link from "next/link";
import { Downloads } from "@/components/downloads";
import { Mark } from "@/components/logo";
import { npmUrl, repository } from "@/lib/shared";

const links = [
	["Docs", "/quick-start/"],
	["Benchmarks", "/benchmarks/"],
	["Compare", "/guides/link-preview-library-comparison/"],
];

// Aspen-style bar: the mark in its own black cell, plain links, and one
// solid action cell on the right.
export function SiteHeader({ version }: { version: string }) {
	const search = useSearchContext();
	return (
		<header className="sticky top-0 z-40 grid h-14 grid-cols-[3.5rem_1fr_auto] border-ink border-b bg-fd-background sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
			<Link
				href="/"
				aria-label="linkpeek home"
				className="group/logo block bg-ink"
			>
				<Mark className="size-14" />
			</Link>
			<div className="hidden items-center gap-3 px-5 sm:flex">
				<span className="font-medium tracking-[-0.03em]">linkpeek</span>
				<span className="font-mono text-fd-muted-foreground text-xs">
					v{version}
				</span>
				{/* Where Aspen shows the local time, linkpeek shows live usage. */}
				<span className="ml-auto hidden font-mono text-fd-muted-foreground text-xs xl:inline">
					<Downloads />
				</span>
			</div>
			<nav
				aria-label="Main"
				className="flex items-center gap-5 overflow-x-auto px-4 text-sm sm:border-ink sm:border-l sm:px-5"
			>
				{links.map(([label, href]) => (
					<Link
						key={href}
						href={href}
						className="whitespace-nowrap hover:underline hover:underline-offset-4"
					>
						{label}
					</Link>
				))}
				<a
					href={repository}
					className="hidden whitespace-nowrap hover:underline hover:underline-offset-4 md:inline"
				>
					GitHub
				</a>
				<a
					href={npmUrl}
					className="hidden whitespace-nowrap hover:underline hover:underline-offset-4 md:inline"
				>
					npm
				</a>
				{search.enabled && (
					<button
						type="button"
						onClick={() => search.setOpenSearch(true)}
						className="ml-auto hidden items-center gap-2 font-mono text-fd-muted-foreground text-xs hover:text-fd-foreground lg:flex"
					>
						Search <kbd className="border border-rule px-1.5">⌘K</kbd>
					</button>
				)}
			</nav>
			<Link
				href="/quick-start/"
				className="press group flex items-center gap-3 bg-ink px-5 font-mono text-[0.72rem] text-white uppercase tracking-[0.04em] transition-[background-color,color,transform] hover:bg-mark hover:text-ink"
			>
				<span className="hidden sm:inline">Get started</span>
				<svg
					viewBox="0 0 16 16"
					aria-hidden="true"
					className="size-4"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
				>
					<path d="M3 8h10M9 4l4 4-4 4" />
				</svg>
			</Link>
		</header>
	);
}
