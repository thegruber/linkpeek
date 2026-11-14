import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import type { Metadata } from "next";
import Link from "next/link";
import { BenchmarkChart } from "@/components/benchmarks";
import { Downloads } from "@/components/downloads";
import { HeroDemo } from "@/components/hero-demo";
import { InstallCommand } from "@/components/install-command";
import { Logo } from "@/components/logo";
import { LiveResult } from "@/components/self-preview";
import { Showcase } from "@/components/showcase";
import { StreamDiagram } from "@/components/stream-diagram";
import { benchmarkDate } from "@/lib/benchmarks";
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
import { showcase } from "@/lib/showcase";
import { packageVersion } from "@/lib/version";

const image = {
	url: `${siteUrl}${ogImagePath([]).slice(1)}`,
	width: 1200,
	height: 630,
	alt: "linkpeek: fast, safe link previews for TypeScript",
};

export const metadata: Metadata = {
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

const usage = `import { preview } from "linkpeek";

const card = await preview(url);

if (card.statusCode < 400) {
  render({
    title: card.title,
    description: card.description,
    image: card.image,
  });
}`;

const safety = [
	"Every redirect is validated before the next request.",
	"Private, loopback and cloud-metadata IP addresses are refused by default.",
	"At most 30 kB is kept, so a huge response cannot exhaust memory.",
	"Cookies and authorization headers never leave your server.",
];

const runtimes = [
	["Node.js", "/integrations/node-express/"],
	["Next.js", "/integrations/nextjs/"],
	["Cloudflare Workers", "/integrations/cloudflare-workers/"],
	["Bun", "/quick-start/"],
	["Deno", "/quick-start/"],
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

			<div className="mx-auto max-w-[1440px] border-rule border-x">
				{/* Hero: what it does in one line, and the thing itself. */}
				<section className="grid border-rule border-b lg:grid-cols-12">
					<div className="flex flex-col gap-8 border-rule px-5 py-12 sm:px-8 lg:col-span-6 lg:border-r lg:py-16">
						<h1 className="max-w-[13ch] font-normal text-[clamp(2.75rem,5.2vw,5rem)] leading-[0.95] tracking-[-0.045em]">
							Turn any URL into a{" "}
							<span className="highlight text-mark-ink">link preview</span>.
						</h1>
						<p className="max-w-[46ch] text-fd-muted-foreground text-lg leading-relaxed">
							linkpeek is a TypeScript library that fetches a page, reads only
							its <code className="text-fd-foreground">&lt;head&gt;</code>, and
							returns a typed title, description, image and favicon. One
							dependency. Node.js, Bun, Deno and edge runtimes.
						</p>
						<div className="grid max-w-xl gap-3">
							<InstallCommand />
							<div className="grid grid-cols-2">
								<Link
									href="/quick-start/"
									className="press group flex min-h-12 items-center justify-between bg-fd-foreground px-4 font-medium text-fd-background text-sm transition-[background-color,color,transform] hover:bg-signal hover:text-signal-ink"
								>
									Quick start
									<ArrowIcon />
								</Link>
								<Link
									href="/benchmarks/"
									className="press group flex min-h-12 items-center justify-between border border-rule border-l-0 px-4 font-medium text-sm transition-[background-color,transform] hover:bg-fd-card"
								>
									Benchmarks
									<ArrowIcon />
								</Link>
							</div>
						</div>
						<p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 font-mono text-fd-muted-foreground text-xs">
							<a href={npmUrl} className="hover:text-fd-foreground">
								v{packageVersion}
							</a>
							<span>MIT</span>
							<span>1 dependency</span>
							<span>types included</span>
							<Downloads />
						</p>
					</div>
					<div className="border-rule border-t lg:col-span-6 lg:border-t-0">
						<HeroDemo examples={cards} />
					</div>
				</section>

				{/* The code that produces it. */}
				<section className="grid border-rule border-b lg:grid-cols-12">
					<div className="px-5 pt-12 pb-6 sm:px-8 lg:col-span-4 lg:py-14">
						<h2 className="font-normal text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.02] tracking-[-0.04em]">
							One call, one typed result
						</h2>
						<p className="mt-4 max-w-[42ch] text-fd-muted-foreground leading-relaxed">
							Call <code>preview()</code> on your server or at the edge. Missing
							fields are <code>null</code>; error pages keep their status code
							so you know what to cache. The JSON is linkpeek parsing this page,
							live in your browser.
						</p>
					</div>
					<div className="grid min-w-0 gap-0 px-5 pb-12 sm:px-8 lg:col-span-8 lg:grid-cols-2 lg:py-14">
						<div className="min-w-0 [&_figure]:my-0 [&_figure]:rounded-none">
							<ServerCodeBlock code={usage} lang="ts" />
						</div>
						<div className="min-w-0">
							<LiveResult />
						</div>
					</div>
				</section>

				{/* Why it is fast: a real page to scale, then the benchmark. */}
				<section className="border-rule border-b px-5 py-12 sm:px-8 lg:py-16">
					<div className="grid gap-6 lg:grid-cols-12">
						<div className="lg:col-span-4">
							<h2 className="font-normal text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.02] tracking-[-0.04em]">
								It stops reading at &lt;/head&gt;
							</h2>
							<p className="mt-4 max-w-[42ch] text-fd-muted-foreground leading-relaxed">
								Preview metadata lives in the head. linkpeek parses the response
								as a stream and cancels it there, so a large page costs about as
								much as a small one. Measured on {benchmarkDate} against five
								other packages.
							</p>
							<Link
								href="/benchmarks/"
								className="mt-5 inline-flex items-center gap-2 font-medium text-sm underline decoration-rule underline-offset-4 hover:decoration-fd-foreground"
							>
								Method and all results
							</Link>
						</div>
						<div className="grid min-w-0 gap-6 lg:col-span-8">
							{largest && <StreamDiagram page={largest} />}
							<div className="[&_.bars]:my-0">
								<BenchmarkChart kind="large" />
							</div>
						</div>
					</div>
				</section>

				<Showcase />

				{/* Safety, runtimes and comparisons: short, scannable lists. */}
				<section className="grid border-rule border-b lg:grid-cols-3">
					<div className="border-rule border-b px-5 py-10 sm:px-8 lg:border-r lg:border-b-0">
						<h2 className="font-medium text-lg tracking-tight">
							Safe by default
						</h2>
						<ul className="mt-4 grid gap-2.5 text-fd-muted-foreground text-sm leading-relaxed">
							{safety.map((line) => (
								<li key={line} className="flex gap-3">
									<span
										aria-hidden="true"
										className="mt-2 size-1.5 shrink-0 bg-fd-foreground"
									/>
									{line}
								</li>
							))}
						</ul>
						<Link
							href="/security/"
							className="mt-5 inline-block text-sm underline decoration-rule underline-offset-4 hover:decoration-fd-foreground"
						>
							Security model and limits
						</Link>
					</div>
					<div className="border-rule border-b px-5 py-10 sm:px-8 lg:border-r lg:border-b-0">
						<h2 className="font-medium text-lg tracking-tight">
							Runs where fetch runs
						</h2>
						<ul className="mt-4 flex flex-wrap gap-2">
							{runtimes.map(([name, href]) => (
								<li key={name}>
									<Link
										href={href}
										className="press inline-flex min-h-10 items-center border border-rule px-3 font-mono text-xs transition-[background-color,color,transform] hover:bg-fd-foreground hover:text-fd-background"
									>
										{name}
									</Link>
								</li>
							))}
						</ul>
						<p className="mt-4 text-fd-muted-foreground text-sm leading-relaxed">
							ESM and CommonJS with TypeScript declarations, on Node.js 22.12+
							and any runtime with Web Streams.
						</p>
					</div>
					<div className="px-5 py-10 sm:px-8">
						<h2 className="font-medium text-lg tracking-tight">
							Choosing a library?
						</h2>
						<ul className="mt-4 grid">
							{comparisons.map(([label, href]) => (
								<li key={label} className="border-rule border-b first:border-t">
									<Link
										href={href}
										className="group flex min-h-11 items-center justify-between gap-4 text-sm transition-colors hover:text-signal-text"
									>
										{label}
										<ArrowIcon />
									</Link>
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* Close: the next step, nothing else. */}
				<section className="grid gap-8 px-5 py-14 sm:px-8 lg:grid-cols-12 lg:py-20">
					<div className="lg:col-span-7">
						<h2 className="font-normal text-[clamp(2rem,4vw,3.5rem)] leading-[0.98] tracking-[-0.045em]">
							Add link previews to your app.
						</h2>
						<p className="mt-4 max-w-[46ch] text-fd-muted-foreground text-lg">
							Install, call <code>preview()</code>, render the card.
						</p>
					</div>
					<div className="flex flex-col justify-end gap-3 lg:col-span-5">
						<InstallCommand />
						<Link
							href="/quick-start/"
							className="press group flex min-h-12 items-center justify-between bg-fd-foreground px-4 font-medium text-fd-background text-sm transition-[background-color,color,transform] hover:bg-signal hover:text-signal-ink"
						>
							Read the quick start
							<ArrowIcon />
						</Link>
					</div>
				</section>

				<footer className="grid border-rule border-t text-sm lg:grid-cols-12">
					<div className="flex items-center gap-3 border-rule px-5 py-6 sm:px-8 lg:col-span-4 lg:border-r">
						<Logo />
						<span className="font-mono text-fd-muted-foreground text-xs">
							v{packageVersion} · MIT
						</span>
					</div>
					<nav
						aria-label="Resources"
						className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-fd-muted-foreground sm:px-8 lg:col-span-8"
					>
						<Link href="/quick-start/" className="hover:text-fd-foreground">
							Docs
						</Link>
						<Link href="/api/" className="hover:text-fd-foreground">
							API
						</Link>
						<a
							href={`${repository}/releases`}
							className="hover:text-fd-foreground"
						>
							Releases
						</a>
						<a href={npmUrl} className="hover:text-fd-foreground">
							npm
						</a>
						<a href={repository} className="hover:text-fd-foreground">
							GitHub
						</a>
						<a href="llms.txt" className="hover:text-fd-foreground">
							llms.txt
						</a>
						<span className="ml-auto">{author}</span>
					</nav>
				</footer>
			</div>
		</main>
	);
}

function ArrowIcon() {
	return (
		<svg
			viewBox="0 0 16 16"
			aria-hidden="true"
			className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
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
