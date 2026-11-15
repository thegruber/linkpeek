import type { Metadata } from "next";
import Link from "next/link";
import { AgentPromptBlock } from "@/components/agent-prompt-block";
import { BenchmarkChart } from "@/components/benchmarks";
import { Dither } from "@/components/dither";
import { Downloads } from "@/components/downloads";
import { HeroDemo } from "@/components/hero-demo";
import { InstallCommand } from "@/components/install-command";
import { Logo } from "@/components/logo";
import { RollingFigure } from "@/components/motion-text";
import { Showcase } from "@/components/showcase";
import { StreamDiagram } from "@/components/stream-diagram";
import { tiles } from "@/lib/benchmarks";
import {
	appName,
	author,
	home,
	npmUrl,
	ogImagePath,
	openGraphDefaults,
	repository,
	siteUrl,
} from "@/lib/shared";
import { capturedLabel, showcase } from "@/lib/showcase";
import { packageVersion } from "@/lib/version";

const image = {
	url: `${siteUrl}${ogImagePath([]).slice(1)}`,
	width: 1200,
	height: 630,
	alt: "linkpeek: fast, safe link previews for TypeScript",
};

export const metadata: Metadata = {
	robots: { "max-image-preview": "large" },
	alternates: {
		canonical: siteUrl,
		types: { "text/markdown": `${siteUrl}index.md` },
	},
	openGraph: {
		...openGraphDefaults,
		type: "website",
		url: siteUrl,
		title: `${home.title} · ${appName}`,
		description: home.description,
		images: [image],
	},
	twitter: {
		card: "summary_large_image",
		title: `${home.title} · ${appName}`,
		description: home.description,
		images: [image],
	},
};

const safety = [
	"Every redirect is validated before the next request.",
	"Private, loopback and cloud-metadata IPs in URLs are refused by default.",
	"At most 30 kB is kept, so a huge response cannot exhaust memory.",
	"Credential headers are refused, and custom headers are dropped on cross-origin redirects.",
];

const runtimes = [
	["Node.js", "/integrations/node-express/"],
	["Next.js", "/integrations/nextjs/"],
	["Cloudflare Workers", "/integrations/cloudflare-workers/"],
	["Bun and Deno", "/quick-start/#install"],
	["AI agents", "/integrations/ai-agents/"],
];

const comparisons = [
	["linkpeek vs link-preview-js", "/guides/link-preview-js-alternative/"],
	["linkpeek vs open-graph-scraper", "/guides/open-graph-scraper-alternative/"],
	[
		"All preview libraries compared",
		"/guides/link-preview-library-comparison/",
	],
];

export default async function HomePage() {
	const cards = await showcase();
	const largest = cards.reduce<(typeof cards)[number] | undefined>(
		(best, card) => (!best || card.pageBytes > best.pageBytes ? card : best),
		undefined,
	);
	return (
		<main className="w-full">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON-LD
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(softwareSchema()).replaceAll("<", "\\u003c"),
				}}
			/>

			{/* First screen: the statement, the product, the art, the pitch, the install. */}
			<section className="grid border-ink border-b lg:min-h-[calc(100svh-3.5rem)] lg:grid-cols-4 lg:grid-rows-[1fr_auto_auto] xl:grid-rows-[minmax(0,1.55fr)_minmax(0,1fr)]">
				<div className="flex flex-col justify-between gap-10 border-ink border-b px-5 pt-10 pb-8 sm:px-8 lg:col-span-2 lg:border-r">
					<p className="font-mono text-[0.72rem] uppercase tracking-[0.06em]">
						TypeScript link preview library
					</p>
					<h1 className="isolate max-w-[12ch] text-balance font-normal text-[clamp(3rem,6.2vw,6.25rem)] leading-[0.92] tracking-[-0.05em]">
						Turn any URL into{" "}
						<span className="whitespace-nowrap">
							a <span className="highlight">link preview</span>.
						</span>
					</h1>
				</div>
				<HeroDemo
					examples={cards}
					capturedLabel={capturedLabel}
					className="border-ink border-b lg:col-span-2"
					codeClassName="border-ink border-b lg:col-span-2 lg:row-span-2 lg:border-r lg:border-b-0 xl:row-span-1"
				/>
				<div className="flex flex-col justify-between gap-8 bg-ink px-5 py-7 text-white sm:px-8 lg:col-span-2 xl:col-span-1 xl:border-ink xl:border-r">
					<p className="text-[1.35rem] leading-[1.2] tracking-[-0.02em]">
						Reads only the <code>&lt;head&gt;</code>. Blocks private IPs. One
						dependency. Node.js, Bun, Deno and the edge.
					</p>
					<Link
						href="/quick-start/"
						className="group flex items-center justify-between font-mono text-[0.72rem] uppercase tracking-[0.06em] hover:text-mark"
					>
						Read the quick start
						<ArrowIcon />
					</Link>
				</div>
				<div className="flex flex-col justify-between gap-8 bg-block px-5 py-7 sm:px-8 lg:col-span-2 xl:col-span-1">
					<div className="grid min-w-0 grid-cols-1 gap-3">
						<p className="text-[1.35rem] leading-[1.2] tracking-[-0.02em]">
							Install
						</p>
						<InstallCommand tone="block" />
					</div>
					<p className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.72rem]">
						<span>v{packageVersion}</span>
						<span>MIT</span>
						<span>types included</span>
						<span className="xl:hidden">
							<Downloads />
						</span>
					</p>
				</div>
			</section>

			{/* Why it is fast. */}
			<section className="grid border-ink border-b lg:grid-cols-4">
				<div className="flex flex-col gap-6 bg-ink px-5 py-10 text-white sm:px-8 lg:col-span-1 lg:py-12">
					<h2 className="font-normal text-[clamp(2.25rem,3.6vw,3.5rem)] uppercase leading-[0.92] tracking-[-0.04em]">
						Reads the head. Skips the rest.
					</h2>
					<p className="text-sm text-white/75 leading-relaxed">
						Preview metadata lives in the <code>&lt;head&gt;</code>. linkpeek
						parses the response as a stream and cancels it at{" "}
						<code>&lt;/head&gt;</code>, so a large page costs about as much as a
						small one.
					</p>
				</div>
				<div className="grid min-w-0 gap-6 px-5 py-10 sm:px-8 lg:col-span-3 lg:py-12">
					{largest && <StreamDiagram page={largest} />}
					<div className="[&_.bars]:my-0">
						<BenchmarkChart kind="large" />
					</div>
				</div>
			</section>

			{/* Measured figures as tiles, each with its comparison drawn to scale:
			    orange is linkpeek, grey what it is measured against. */}
			<section
				aria-label="Measured results"
				className="grid grid-cols-2 border-ink border-b lg:grid-cols-4"
			>
				{tiles().map((tile, index) => {
					const max = Math.max(...tile.bars.map((bar) => bar.value));
					return (
						<Link
							key={tile.label}
							href={tile.href}
							className={`cell group flex min-h-48 flex-col justify-between gap-6 border-ink px-5 py-6 sm:min-h-60 sm:px-8 ${index % 2 === 0 ? "border-r" : "lg:border-r"} ${index === 3 ? "lg:border-r-0" : ""} ${index < 2 ? "border-b lg:border-b-0" : ""}`}
						>
							<span className="grid gap-3">
								<RollingFigure
									value={tile.figure}
									decimals={tile.decimals}
									suffix={tile.suffix}
									className="figures block font-normal text-[clamp(3rem,5vw,5rem)] leading-none tracking-[-0.05em]"
								/>
								<span className="text-sm leading-snug">{tile.label}</span>
							</span>
							<span className="grid gap-2" aria-hidden="true">
								{tile.bars.map((bar, row) => (
									<span key={bar.name} className="grid gap-1">
										<span className="flex justify-between gap-3 font-mono text-[0.68rem] text-fd-muted-foreground">
											<span className="truncate">{bar.name}</span>
											<span className="figures shrink-0">{bar.label}</span>
										</span>
										<span className="block h-1.5 bg-fd-muted">
											<span
												className={`bars-tile block h-full ${row === 0 ? "bg-mark" : "bg-shape"}`}
												style={{
													width: `${Math.max(1.5, (bar.value / max) * 100)}%`,
												}}
											/>
										</span>
									</span>
								))}
							</span>
						</Link>
					);
				})}
			</section>

			<Showcase />

			{/* For coding agents: the whole integration as one task. */}
			<section className="grid border-ink border-b lg:grid-cols-4">
				<div className="flex flex-col justify-between gap-6 px-5 pt-10 pb-6 sm:px-8 lg:border-ink lg:border-r lg:py-12">
					<h2 className="font-normal text-[clamp(2.25rem,3.6vw,3.5rem)] uppercase leading-[0.92] tracking-[-0.04em]">
						Let your agent add it.
					</h2>
					<p className="max-w-[34ch] text-fd-muted-foreground text-sm leading-relaxed">
						One task for Claude Code, Cursor, Codex or Copilot: install, a
						server endpoint, a card component, caching and the safety rules.
						Agents can also read{" "}
						<a href="prompt.md" className="u-line">
							prompt.md
						</a>{" "}
						and{" "}
						<a href="llms.txt" className="u-line">
							llms.txt
						</a>
						.
					</p>
				</div>
				<div className="min-w-0 px-5 pb-10 sm:px-8 lg:col-span-3 lg:py-12">
					<AgentPromptBlock />
				</div>
			</section>

			{/* Short lists. */}
			<section className="grid border-ink border-b lg:grid-cols-3">
				<div className="border-ink border-b px-5 py-10 sm:px-8 lg:border-r lg:border-b-0">
					<h2 className="font-mono text-[0.72rem] uppercase tracking-[0.06em]">
						Safe by default
					</h2>
					<ul className="mt-5 grid gap-3 text-[0.95rem] leading-snug">
						{safety.map((line) => (
							<li key={line} className="border-ink border-t pt-3">
								{line}
							</li>
						))}
					</ul>
					<Link
						href="/security/"
						className="mt-6 inline-block text-sm underline underline-offset-4"
					>
						Security model and limits
					</Link>
				</div>
				<div className="border-ink border-b px-5 py-10 sm:px-8 lg:border-r lg:border-b-0">
					<h2 className="font-mono text-[0.72rem] uppercase tracking-[0.06em]">
						Runs where fetch runs
					</h2>
					<ul className="-mx-3 mt-5 grid">
						{runtimes.map(([name, href]) => (
							<li key={name} className="border-ink border-t">
								<Link
									href={href}
									className="cell group flex min-h-11 items-center justify-between px-3 text-[0.95rem]"
								>
									{name}
									<ArrowIcon />
								</Link>
							</li>
						))}
					</ul>
				</div>
				<div className="px-5 py-10 sm:px-8">
					<h2 className="font-mono text-[0.72rem] uppercase tracking-[0.06em]">
						Choosing a library
					</h2>
					<ul className="-mx-3 mt-5 grid">
						{comparisons.map(([label, href]) => (
							<li key={label} className="border-ink border-t">
								<Link
									href={href}
									className="cell group flex min-h-11 items-center justify-between px-3 text-[0.95rem]"
								>
									{label}
									<ArrowIcon />
								</Link>
							</li>
						))}
					</ul>
				</div>
			</section>

			{/* Close: the dither band with the next step on top. */}
			<section className="relative grid min-h-[26rem] border-ink border-b lg:grid-cols-4">
				<div className="relative min-h-56 lg:col-span-2">
					<Dither
						className="absolute inset-0"
						place={{ x: 0.62, width: 0.5 }}
						tone={-0.05}
					/>
				</div>
				<div className="flex flex-col justify-between gap-8 bg-ink px-5 py-10 text-white sm:px-8 lg:col-span-2 lg:py-12">
					<h2 className="font-normal text-[clamp(2.25rem,4vw,4rem)] uppercase leading-[0.92] tracking-[-0.045em]">
						Add link previews to your app.
					</h2>
					<div className="grid gap-3">
						<InstallCommand tone="dark" />
						<Link
							href="/quick-start/"
							className="press group flex min-h-12 items-center justify-between bg-white px-4 font-mono text-[0.72rem] text-ink uppercase tracking-[0.06em] transition-[background-color,transform] hover:bg-mark"
						>
							Read the quick start
							<ArrowIcon />
						</Link>
					</div>
				</div>
			</section>

			<footer className="grid text-sm lg:grid-cols-4">
				<div className="flex items-center gap-3 border-ink border-b px-5 py-6 sm:px-8 lg:border-r lg:border-b-0">
					<Logo />
				</div>
				<nav
					aria-label="Documentation"
					className="grid content-start border-ink border-b px-5 py-6 sm:px-8 lg:border-r lg:border-b-0"
				>
					<Link
						href="/quick-start/"
						className="u-line w-fit py-1.5 [--line-y:3px]"
					>
						Quick start
					</Link>
					<Link href="/api/" className="u-line w-fit py-1.5 [--line-y:3px]">
						API reference
					</Link>
					<Link
						href="/benchmarks/"
						className="u-line w-fit py-1.5 [--line-y:3px]"
					>
						Benchmarks
					</Link>
					<Link
						href="/guides/troubleshooting/"
						className="u-line w-fit py-1.5 [--line-y:3px]"
					>
						Troubleshooting
					</Link>
					<Link
						href="/guides/link-preview-library-comparison/"
						className="u-line w-fit py-1.5 [--line-y:3px]"
					>
						Compare libraries
					</Link>
					<Link
						href="/security/"
						className="u-line w-fit py-1.5 [--line-y:3px]"
					>
						Security
					</Link>
				</nav>
				<nav
					aria-label="Resources"
					className="grid content-start border-ink border-b px-5 py-6 sm:px-8 lg:border-r lg:border-b-0"
				>
					<a href={npmUrl} className="u-line w-fit py-1.5 [--line-y:3px]">
						npm
					</a>
					<a href={repository} className="u-line w-fit py-1.5 [--line-y:3px]">
						GitHub
					</a>
					<a
						href={`${repository}/releases`}
						className="u-line w-fit py-1.5 [--line-y:3px]"
					>
						Releases
					</a>
					<a href="llms.txt" className="u-line w-fit py-1.5 [--line-y:3px]">
						llms.txt
					</a>
				</nav>
				<div className="grid content-start gap-2 px-5 py-6 font-mono text-fd-muted-foreground text-xs sm:px-8">
					<span>v{packageVersion} · MIT</span>
					<span>{author}</span>
				</div>
			</footer>
		</main>
	);
}

function ArrowIcon() {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden="true"
			className="cell-arrow size-4 shrink-0"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
		>
			<path d="M3 8h10M9 4l4 4-4 4" />
		</svg>
	);
}

function softwareSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "SoftwareSourceCode",
		"@id": `${siteUrl}#software`,
		name: appName,
		description: home.description,
		url: siteUrl,
		version: packageVersion,
		author: { "@type": "Person", name: author },
		codeRepository: repository,
		codeSampleType: "full",
		license: "https://opensource.org/license/mit",
		programmingLanguage: "TypeScript",
		runtimePlatform: ["Node.js", "Bun", "Deno", "Edge runtimes"],
		sameAs: [npmUrl, repository],
	};
}
