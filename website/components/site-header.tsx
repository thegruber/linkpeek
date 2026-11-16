"use client";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { BookOpen, ChartNoAxesColumn, Scale, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { Downloads } from "@/components/downloads";
import { Mark } from "@/components/logo";
import { npmUrl, repository } from "@/lib/shared";

const links = [
	["Docs", "/quick-start/", BookOpen],
	["Benchmarks", "/benchmarks/", ChartNoAxesColumn],
	["Compare", "/guides/link-preview-library-comparison/", Scale],
] as const;

const ICON = "size-[0.95rem] shrink-0 text-fd-muted-foreground";

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
				{links.map(([label, href, Icon]) => (
					<Link
						key={href}
						href={href}
						aria-current={section(href) ? "page" : undefined}
						className={`${href.includes("comparison") ? "hidden sm:flex" : "flex"} u-line min-h-11 items-center gap-1.5 whitespace-nowrap [--line-y:0.6rem]`}
					>
						<Icon
							aria-hidden="true"
							strokeWidth={1.5}
							className={`${ICON} hidden lg:block`}
						/>
						{label}
					</Link>
				))}
				<a
					href={repository}
					className="u-line hidden min-h-11 items-center gap-1.5 whitespace-nowrap [--line-y:0.6rem] xl:flex"
				>
					<GitHubIcon />
					<span className="sr-only 2xl:not-sr-only">GitHub</span>
				</a>
				<a
					href={npmUrl}
					className="u-line hidden min-h-11 items-center gap-1.5 whitespace-nowrap [--line-y:0.6rem] xl:flex"
				>
					<NpmIcon />
					<span className="sr-only 2xl:not-sr-only">npm</span>
				</a>
				{search.enabled && (
					<button
						type="button"
						onClick={() => search.setOpenSearch(true)}
						className="press ml-auto hidden shrink-0 items-center gap-2 whitespace-nowrap font-mono text-fd-muted-foreground text-xs transition-[color,transform] hover:text-fd-foreground xl:flex"
					>
						<Search
							aria-hidden="true"
							strokeWidth={1.5}
							className="size-[0.95rem]"
						/>
						Search{" "}
						<kbd className="whitespace-nowrap border border-rule px-1.5">
							{shortcut}
						</kbd>
					</button>
				)}
			</nav>
			{search.enabled && (
				<button
					type="button"
					aria-label="Search the docs"
					onClick={() => search.setOpenSearch(true)}
					className="cell grid w-14 place-items-center border-ink border-l xl:hidden"
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

function GitHubIcon() {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden="true"
			className={ICON}
			fill="currentColor"
		>
			<path d="M8 .2a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.81.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 .2Z" />
		</svg>
	);
}

function NpmIcon() {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden="true"
			className={ICON}
			fill="currentColor"
		>
			<path d="M1 1h14v14H1V1Zm2.5 2.5v9h4.5V6h2.5v6.5h2v-9h-9Z" />
		</svg>
	);
}
