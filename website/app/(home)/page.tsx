import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BenchmarkChart } from "@/components/benchmarks";
import { Downloads } from "@/components/downloads";
import { InstallCommand } from "@/components/install-command";
import { Logo } from "@/components/logo";
import { PeekPanel } from "@/components/peek-panel";
import { LiveResult, UnfurlDemo } from "@/components/self-preview";
import { benchmarkDate, highlights } from "@/lib/benchmarks";
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

const badges = [
	{
		href: npmUrl,
		src: "https://img.shields.io/npm/v/linkpeek",
		alt: "npm version",
	},
	{
		href: `${repository}/actions/workflows/ci.yml`,
		src: `${repository}/actions/workflows/ci.yml/badge.svg`,
		alt: "CI status",
	},
	{
		href: `${repository}/blob/main/LICENSE`,
		src: "https://img.shields.io/npm/l/linkpeek",
		alt: "MIT license",
	},
];

const safety = [
	[
		"Every redirect is checked",
		"The first URL and each redirect target are validated before the next request.",
	],
	[
		"Private addresses are blocked",
		"Loopback, link-local, cloud metadata and other non-global IP literals are refused by default.",
	],
	[
		"Reads are capped",
		"The fast preset keeps at most 30 kB and stops after the head; huge responses cannot exhaust memory.",
	],
	[
		"Credentials stay home",
		"Cookie and authorization headers are rejected, and custom headers are dropped on cross-origin redirects.",
	],
];

const runtimes = [
	["Next.js", "/integrations/nextjs/", "A Route Handler that returns cards."],
	[
		"Cloudflare Workers",
		"/integrations/cloudflare-workers/",
		"Extract and cache at the edge.",
	],
	[
		"Node.js and Express",
		"/integrations/node-express/",
		"A preview API in a few lines.",
	],
	["AI agents", "/integrations/ai-agents/", "Link metadata as a tool result."],
];

export default function HomePage() {
	const stats = highlights();
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
				{/* Hero: headline and the peek, then the pitch and the live demo. */}
				<section className="grid border-rule border-b lg:grid-cols-12">
					<div className="flex flex-col justify-end border-rule px-5 pt-14 pb-8 sm:px-8 lg:col-span-8 lg:border-r lg:pt-24 lg:pb-10">
						<h1 className="font-normal text-[clamp(3rem,7.4vw,7.25rem)] leading-[0.9] tracking-[-0.05em]">
							TypeScript link previews,{" "}
							<span className="text-fd-muted-foreground">head first.</span>
						</h1>
					</div>
					<div className="border-rule border-t lg:col-span-4 lg:border-t-0">
						<PeekPanel />
					</div>
				</section>

				<section className="grid border-rule border-b lg:grid-cols-12">
					<div className="flex flex-col justify-between gap-10 border-rule px-5 py-8 sm:px-8 lg:col-span-5 lg:border-r lg:py-10">
						<p className="max-w-[44ch] text-fd-muted-foreground text-lg leading-relaxed">
							linkpeek turns a URL into its title, description, image and
							favicon from Open Graph, Twitter Card and JSON-LD. It reads the{" "}
							<code className="text-fd-foreground">&lt;head&gt;</code>, stops,
							and blocks private addresses on the way. One dependency. Node.js,
							Bun, Deno and the edge.
						</p>
						<div className="grid gap-3">
							<InstallCommand />
							<div className="grid grid-cols-2">
								<Link
									href="/quick-start/"
									className="flex min-h-12 items-center justify-between bg-fd-foreground px-4 font-medium text-fd-background text-sm transition-colors hover:bg-signal hover:text-white"
								>
									Quick start
									<ArrowIcon />
								</Link>
								<Link
									href="/benchmarks/"
									className="flex min-h-12 items-center justify-between border border-rule border-l-0 px-4 font-medium text-sm transition-colors hover:bg-fd-card"
								>
									Benchmarks
									<ArrowIcon />
								</Link>
							</div>
							<span className="flex flex-wrap gap-1.5 pt-2">
								{badges.map((badge) => (
									<a
										key={badge.alt}
										href={badge.href}
										className="block leading-none"
									>
										{/* biome-ignore lint/performance/noImgElement: external SVG badge */}
										<img
											src={badge.src}
											alt={badge.alt}
											height={20}
											className="h-5 w-auto"
										/>
									</a>
								))}
							</span>
						</div>
					</div>
					<div className="border-rule border-t lg:col-span-7 lg:border-t-0">
						<UnfurlDemo />
					</div>
				</section>

				{/* Measured numbers, Swiss-style: big figures, small labels. */}
				<section
					aria-label="Measured results"
					className="grid border-rule border-b sm:grid-cols-2 lg:grid-cols-4"
				>
					{stats.map((item) => (
						<Link
							key={item.label}
							href="/benchmarks/"
							className="flex flex-col justify-between gap-6 border-rule border-b px-5 py-6 transition-colors hover:bg-fd-card sm:border-r lg:border-b-0"
						>
							<span className="figures block font-normal text-[clamp(2.5rem,4vw,3.75rem)] leading-none tracking-[-0.045em]">
								{item.value}
							</span>
							<span className="text-fd-muted-foreground text-sm">
								{item.label}
							</span>
						</Link>
					))}
					<Downloads />
				</section>

				<Row
					path="/benchmarks"
					href="/benchmarks/"
					title="Reads the head, skips the rest"
					lede={
						<>
							Metadata lives in the <code>&lt;head&gt;</code>. linkpeek parses
							the response as a stream and cancels it after{" "}
							<code>&lt;/head&gt;</code>, so a 500 kB page costs about as much
							as a small one. Measured on {benchmarkDate}; on small pages the
							packages are within a few milliseconds.
						</>
					}
				>
					<BenchmarkChart kind="large" />
				</Row>

				<Row
					path="/quick-start"
					href="/quick-start/"
					title="From URL to card in one call"
					lede="Call preview() on your server or at the edge and render the fields you need. Missing metadata is null; HTTP error pages still return their metadata with a status code. The JSON on the right is linkpeek parsing this page in your browser."
				>
					<div className="grid lg:grid-cols-2">
						<div className="min-w-0 [&_figure]:my-0 [&_figure]:rounded-none">
							<ServerCodeBlock code={usage} lang="ts" />
						</div>
						<div className="min-w-0 border-rule lg:border-l-0">
							<LiveResult />
						</div>
					</div>
				</Row>

				<Row
					path="/security"
					href="/security/"
					title="Safe defaults for URLs your users paste"
					lede="A preview endpoint turns user input into outbound requests. linkpeek checks where each request goes before it is made. Hostname resolution belongs to the runtime's fetch, so public endpoints also restrict outbound traffic."
				>
					<dl className="grid border-rule border-t border-l sm:grid-cols-2">
						{safety.map(([title, body]) => (
							<div
								key={title}
								className="border-rule border-r border-b px-5 py-5"
							>
								<dt className="font-medium tracking-tight">{title}</dt>
								<dd className="mt-2 text-fd-muted-foreground text-sm leading-relaxed">
									{body}
								</dd>
							</div>
						))}
					</dl>
				</Row>

				<Row
					path="/integrations"
					href="/integrations/nextjs/"
					title="Runs wherever fetch runs"
					lede="One runtime dependency, ESM and CommonJS with TypeScript declarations, on Node.js 22.12+, Bun, Deno and fetch-compatible edge runtimes."
				>
					<ul className="grid border-rule border-t border-l sm:grid-cols-2">
						{runtimes.map(([name, href, body]) => (
							<li key={name} className="border-rule border-r border-b">
								<Link
									href={href}
									className="group flex h-full items-start justify-between gap-4 px-5 py-5 transition-colors hover:bg-fd-foreground hover:text-fd-background"
								>
									<span>
										<span className="block font-medium tracking-tight">
											{name}
										</span>
										<span className="mt-1 block text-fd-muted-foreground text-sm group-hover:text-fd-background/70">
											{body}
										</span>
									</span>
									<ArrowIcon />
								</Link>
							</li>
						))}
					</ul>
				</Row>

				<section className="relative grid overflow-hidden bg-signal text-white lg:grid-cols-12">
					<div
						aria-hidden="true"
						className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/2 text-white/25 [--dot:1.8px] [--pitch:10px] [mask-image:linear-gradient(to_left,black,transparent)]"
					/>
					<div className="relative px-5 py-14 sm:px-8 lg:col-span-7 lg:py-20">
						<h2 className="font-normal text-[clamp(2.25rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.045em]">
							Add link previews to your app.
						</h2>
						<p className="mt-5 max-w-[46ch] text-lg text-white/80">
							Install the package, call <code>preview()</code>, render the card.
							The quick start walks through it in a few minutes.
						</p>
					</div>
					<div className="relative flex flex-col justify-end gap-3 px-5 pb-14 sm:px-8 lg:col-span-5 lg:py-20">
						<InstallCommand tone="signal" />
						<Link
							href="/quick-start/"
							className="flex min-h-12 items-center justify-between bg-white px-4 font-medium text-signal text-sm transition-colors hover:bg-fd-foreground hover:text-fd-background"
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
						<a href="sitemap.xml" className="hover:text-fd-foreground">
							Sitemap
						</a>
						<span className="ml-auto">{author}</span>
					</nav>
				</footer>
			</div>
		</main>
	);
}

// A section on the grid: the route it documents as a mono link, the heading
// and lede in the left column, the content across the rest.
function Row({
	path,
	href,
	title,
	lede,
	children,
}: {
	path: string;
	href: string;
	title: string;
	lede: ReactNode;
	children: ReactNode;
}) {
	const id = path.slice(1);
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			className="grid border-rule border-b lg:grid-cols-12"
		>
			<div className="border-rule px-5 pt-10 pb-6 sm:px-8 lg:col-span-4 lg:border-r lg:py-12">
				<Link
					href={href}
					className="font-mono text-fd-muted-foreground text-xs hover:text-signal"
				>
					{path}
				</Link>
				<h2
					id={`${id}-title`}
					className="mt-4 font-normal text-[clamp(1.75rem,2.6vw,2.5rem)] leading-[1.02] tracking-[-0.04em]"
				>
					{title}
				</h2>
				<p className="mt-4 max-w-[46ch] text-fd-muted-foreground leading-relaxed">
					{lede}
				</p>
			</div>
			<div className="min-w-0 px-5 pb-10 sm:px-8 lg:col-span-8 lg:py-12 [&_.bars]:my-0">
				{children}
			</div>
		</section>
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
