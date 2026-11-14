import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BenchmarkChart, BenchmarkHighlights } from "@/components/benchmarks";
import { Downloads } from "@/components/downloads";
import { InstallCommand } from "@/components/install-command";
import { LiveResult, UnfurlDemo } from "@/components/self-preview";
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
	return (
		<main className="w-full">
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON-LD
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(softwareSchema()).replaceAll("<", "\\u003c"),
				}}
			/>

			<section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-14 pb-16 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
				<div className="min-w-0">
					<h1 className="max-w-[16ch] font-semibold text-[2.5rem] leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
						Fast, safe link previews for TypeScript
					</h1>
					<p className="mt-5 max-w-[56ch] text-fd-muted-foreground text-lg leading-relaxed">
						linkpeek turns a URL into its title, description, image and favicon
						from Open Graph, Twitter Card and JSON-LD. It reads only the page
						head, blocks private addresses by default, and runs on Node.js, Bun,
						Deno and edge runtimes.
					</p>
					<div className="mt-8 grid gap-4">
						<InstallCommand />
						<div className="flex flex-wrap gap-3">
							<Link
								href="/quick-start/"
								className="inline-flex min-h-11 items-center rounded-xl bg-fd-primary px-5 font-medium text-fd-primary-foreground text-sm transition-[filter,transform] hover:brightness-110 active:translate-y-px"
							>
								Read the quick start
							</Link>
							<Link
								href="/benchmarks/"
								className="inline-flex min-h-11 items-center rounded-xl border px-5 font-medium text-sm transition-colors hover:border-signal active:translate-y-px"
							>
								See the benchmarks
							</Link>
						</div>
					</div>
					<div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
						<Downloads />
						<span className="flex flex-wrap gap-1.5">
							{badges.map((badge) => (
								<a
									key={badge.alt}
									href={badge.href}
									className="block leading-none transition-transform hover:-translate-y-px"
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
				<UnfurlDemo />
			</section>

			<Section
				id="performance"
				title="Reads the head, skips the rest"
				lede={
					<>
						Metadata lives in the <code>&lt;head&gt;</code>. linkpeek parses the
						response as a stream and cancels it after <code>&lt;/head&gt;</code>
						, so a 500 kB page costs about as much as a small one. Measured on{" "}
						{benchmarkDate} against five other preview packages; on small pages
						they are within a few milliseconds.
					</>
				}
			>
				<BenchmarkHighlights />
				<BenchmarkChart kind="large" />
				<p className="text-fd-muted-foreground text-sm">
					Small pages, install size and the method are on the{" "}
					<Link
						href="/benchmarks/"
						className="text-fd-foreground underline underline-offset-4"
					>
						benchmark page
					</Link>
					.
				</p>
			</Section>

			<Section
				id="usage"
				title="From URL to card in one call"
				lede="Call preview() on your server or at the edge and render the fields you need. Missing metadata is null; HTTP error pages still return their metadata with a status code."
			>
				<div className="grid gap-4 lg:grid-cols-2">
					<div className="min-w-0 [&_figure]:my-0">
						<ServerCodeBlock code={usage} lang="ts" />
					</div>
					<div className="min-w-0">
						<LiveResult />
					</div>
				</div>
				<p className="mt-4 text-fd-muted-foreground text-sm">
					The result on the right is linkpeek parsing this page, live in your
					browser.
				</p>
			</Section>

			<Section
				id="security"
				title="Safe defaults for URLs your users paste"
				lede={
					<>
						A preview endpoint turns user input into outbound requests. linkpeek
						checks where each request goes before it is made. Hostname
						resolution belongs to the runtime&apos;s <code>fetch</code>, so
						public endpoints should also restrict outbound traffic; the{" "}
						<Link
							href="/security/"
							className="text-fd-foreground underline underline-offset-4"
						>
							security model
						</Link>{" "}
						explains where the line is.
					</>
				}
			>
				<dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
					{safety.map(([title, body]) => (
						<div key={title} className="border-t pt-4">
							<dt className="font-medium">{title}</dt>
							<dd className="mt-1 text-fd-muted-foreground text-sm leading-relaxed">
								{body}
							</dd>
						</div>
					))}
				</dl>
			</Section>

			<Section
				id="runtimes"
				title="Runs wherever fetch runs"
				lede="One runtime dependency, ESM and CommonJS with TypeScript declarations, on Node.js 22.12+, Bun, Deno and fetch-compatible edge runtimes."
			>
				<ul className="grid gap-px overflow-hidden rounded-xl border bg-fd-border sm:grid-cols-2">
					{runtimes.map(([name, href, body]) => (
						<li key={name} className="bg-fd-background">
							<Link
								href={href}
								className="block h-full px-5 py-4 transition-colors hover:bg-fd-card"
							>
								<span className="font-medium">{name}</span>
								<span className="mt-1 block text-fd-muted-foreground text-sm">
									{body}
								</span>
							</Link>
						</li>
					))}
				</ul>
			</Section>

			<section className="mx-auto max-w-6xl px-5 pt-6 pb-20 sm:px-8">
				<div className="grid gap-6 rounded-2xl border bg-fd-card p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
					<div>
						<h2 className="font-semibold text-2xl tracking-tight">
							Add link previews to your app
						</h2>
						<p className="mt-2 max-w-[52ch] text-fd-muted-foreground">
							Install the package, call <code>preview()</code>, render the card.
							The quick start walks through it.
						</p>
					</div>
					<div className="grid gap-3 md:w-[22rem]">
						<InstallCommand />
						<Link
							href="/quick-start/"
							className="inline-flex min-h-11 items-center justify-center rounded-xl bg-fd-primary px-5 font-medium text-fd-primary-foreground text-sm transition-[filter,transform] hover:brightness-110 active:translate-y-px"
						>
							Read the quick start
						</Link>
					</div>
				</div>
				<footer className="mt-10 flex flex-wrap justify-between gap-4 text-fd-muted-foreground text-sm">
					<span>
						linkpeek {packageVersion} · MIT · {author}
					</span>
					<nav aria-label="Resources" className="flex flex-wrap gap-4">
						<a
							href={`${repository}/releases`}
							className="hover:text-fd-foreground"
						>
							Releases
						</a>
						<a href="llms.txt" className="hover:text-fd-foreground">
							llms.txt
						</a>
						<a href="sitemap.xml" className="hover:text-fd-foreground">
							Sitemap
						</a>
						<a href={repository} className="hover:text-fd-foreground">
							GitHub
						</a>
					</nav>
				</footer>
			</section>
		</main>
	);
}

function Section({
	id,
	title,
	lede,
	children,
}: {
	id: string;
	title: string;
	lede: ReactNode;
	children: ReactNode;
}) {
	return (
		<section
			id={id}
			aria-labelledby={`${id}-title`}
			className="mx-auto max-w-6xl border-t px-5 py-16 sm:px-8 md:py-20"
		>
			<div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
				<div>
					<h2
						id={`${id}-title`}
						className="font-semibold text-2xl tracking-tight sm:text-[1.75rem]"
					>
						{title}
					</h2>
					<p className="mt-3 text-fd-muted-foreground leading-relaxed">
						{lede}
					</p>
				</div>
				<div className="min-w-0">{children}</div>
			</div>
		</section>
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
