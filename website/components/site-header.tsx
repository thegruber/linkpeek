"use client";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
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
export function SiteHeader({
	version = process.env.NEXT_PUBLIC_LINKPEEK_VERSION ?? "",
	menu,
}: {
	version?: string;
	/** Mobile docs navigation trigger, shown instead of the action cell. */
	menu?: ReactNode;
}) {
	const search = useSearchContext();
	const [shortcut, setShortcut] = useState("Ctrl K");
	useEffect(() => {
		if (/Mac|iPhone|iPad/.test(navigator.userAgent)) setShortcut("⌘K");
	}, []);
	const pathname = usePathname();
	const compareRoutes = [
		"/benchmarks",
		"/guides/link-preview-library-comparison",
		"/guides/link-preview-js-alternative",
		"/guides/open-graph-scraper-alternative",
	];
	const docsRoutes = [
		"/quick-start",
		"/api",
		"/security",
		"/integrations",
		"/guides",
	];
	const isCompare = compareRoutes.some((route) => pathname.startsWith(route));
	const section = (href: string) => {
		if (href === "/quick-start/") {
			return (
				!isCompare && docsRoutes.some((route) => pathname.startsWith(route))
			);
		}
		if (href === "/benchmarks/") return pathname.startsWith("/benchmarks");
		return isCompare && !pathname.startsWith("/benchmarks");
	};
	const action = (
		<Link
			href="/quick-start/"
			aria-label="Get started"
			className="press group flex items-center gap-3 bg-ink px-5 font-mono lg:w-40 lg:justify-between text-[0.72rem] text-white uppercase tracking-[0.04em] transition-[background-color,color,transform] hover:bg-mark hover:text-ink"
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
	);

	return (
		<header className="sticky top-0 z-40 grid h-14 grid-cols-[3.5rem_1fr_auto_auto] border-ink border-b bg-fd-background sm:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:grid-cols-[3.5rem_calc(50%_-_3.5rem)_minmax(0,1fr)_auto_auto] xl:grid-cols-[3.5rem_calc(50%_-_3.5rem)_minmax(0,1fr)_auto]">
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
				className="flex items-center gap-5 overflow-x-auto px-4 text-sm sm:border-ink sm:border-l sm:px-5 lg:px-4"
			>
				{links.map(([label, href]) => (
					<Link
						key={href}
						href={href}
						aria-current={section(href) ? "page" : undefined}
						className={`${href.includes("comparison") ? "hidden sm:flex" : "flex"} min-h-11 items-center whitespace-nowrap decoration-[#ff5b1f] decoration-2 underline-offset-[6px] hover:underline aria-[current=page]:underline`}
					>
						{label}
					</Link>
				))}
				<a
					href={repository}
					className="hidden whitespace-nowrap hover:underline hover:underline-offset-4 xl:inline"
				>
					GitHub
				</a>
				<a
					href={npmUrl}
					className="hidden whitespace-nowrap hover:underline hover:underline-offset-4 xl:inline"
				>
					npm
				</a>
				{search.enabled && (
					<button
						type="button"
						onClick={() => search.setOpenSearch(true)}
						className="ml-auto hidden items-center gap-2 font-mono text-fd-muted-foreground text-xs hover:text-fd-foreground xl:flex"
					>
						Search <kbd className="border border-rule px-1.5">{shortcut}</kbd>
					</button>
				)}
			</nav>
			{search.enabled && (
				<button
					type="button"
					aria-label="Search the docs"
					onClick={() => search.setOpenSearch(true)}
					className="grid w-14 place-items-center border-ink border-l xl:hidden"
				>
					<svg
						viewBox="0 0 16 16"
						aria-hidden="true"
						className="size-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
					>
						<circle cx="7" cy="7" r="4.5" />
						<path d="m10.5 10.5 3.5 3.5" />
					</svg>
				</button>
			)}
			{menu ? (
				<>
					<div className="md:hidden">{menu}</div>
					<div className="hidden md:flex">{action}</div>
				</>
			) : (
				action
			)}
		</header>
	);
}
