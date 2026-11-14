"use client";
import { useEffect, useState } from "react";
import { appName, home, ogImagePath, siteUrl } from "@/lib/shared";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export interface PreviewFields {
	title: string | null;
	description: string | null;
	image: string | null;
	siteName: string;
	canonicalUrl: string;
}

// What linkpeek returns for this page, known at build time from the same
// constants that write the page's <head>. The client re-parses the live
// document with the published package and replaces it with the real result.
const expected: PreviewFields = {
	title: `${home.title} · ${appName}`,
	description: home.description,
	image: `${siteUrl}${ogImagePath([]).slice(1)}`,
	siteName: appName,
	canonicalUrl: siteUrl,
};

let parsed: Promise<{ fields: PreviewFields; ms: number }> | undefined;

function parseThisPage() {
	parsed ??= import("linkpeek").then(({ parseHTML }) => {
		const html = document.documentElement.outerHTML;
		// Early calls include JIT warm-up. Report the median of later runs, the
		// way a long-running server sees it.
		for (let run = 0; run < 5; run++) parseHTML(html, location.href);
		const times: number[] = [];
		let result = parseHTML(html, location.href);
		for (let run = 0; run < 9; run++) {
			const start = performance.now();
			result = parseHTML(html, location.href);
			times.push(performance.now() - start);
		}
		const ms = times.sort((x, y) => x - y)[4];
		return {
			ms,
			fields: {
				title: result.title,
				description: result.description,
				image: result.image,
				siteName: result.siteName,
				canonicalUrl: result.canonicalUrl,
			},
		};
	});
	return parsed;
}

function useLivePreview() {
	const [state, setState] = useState<{
		fields: PreviewFields;
		ms: number | null;
	}>({ fields: expected, ms: null });
	useEffect(() => {
		let active = true;
		parseThisPage()
			.then((result) => {
				if (active) setState(result);
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, []);
	return state;
}

/** The hero: this page's URL, unfurled into the card an app would render. */
export function UnfurlDemo() {
	const { fields, ms } = useLivePreview();
	const host = new URL(fields.canonicalUrl).host;
	return (
		<div className="relative">
			<div className="rounded-2xl border bg-fd-card p-4 shadow-[0_1px_0_rgb(0_0_0/0.02),0_24px_48px_-24px_rgb(18_20_26/0.18)] sm:p-5">
				<p className="mb-3 w-fit max-w-full truncate rounded-2xl rounded-bl-md bg-fd-secondary px-3.5 py-2 text-sm">
					Have you seen{" "}
					<a
						href={fields.canonicalUrl}
						className="text-signal underline-offset-2 hover:underline"
					>
						{fields.canonicalUrl.replace(/^https:\/\//, "")}
					</a>
					?
				</p>
				<a
					href={fields.canonicalUrl}
					className="unfurl group block overflow-hidden rounded-[14px] border bg-fd-background transition-colors hover:border-signal"
				>
					{/* biome-ignore lint/performance/noImgElement: static export, no image optimizer */}
					<img
						src={`${basePath}${ogImagePath([])}`}
						alt=""
						width={1200}
						height={630}
						className="aspect-[1200/630] w-full border-b object-cover"
					/>
					<span className="grid gap-1 px-4 py-3.5">
						<span className="text-fd-muted-foreground text-xs">{host}</span>
						<strong className="font-semibold text-[0.95rem] leading-snug">
							{fields.title ?? host}
						</strong>
						<span className="line-clamp-2 text-fd-muted-foreground text-sm leading-snug">
							{fields.description}
						</span>
					</span>
				</a>
			</div>
			<p
				className="mt-3 min-h-5 text-fd-muted-foreground text-xs"
				aria-live="polite"
			>
				{ms === null
					? " "
					: `Parsed from this page by linkpeek in ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms (median of 9 runs), in your browser.`}
			</p>
		</div>
	);
}

/** The same live result as JSON, next to the code that produces it. */
export function LiveResult() {
	const { fields } = useLivePreview();
	return (
		<pre className="h-full whitespace-pre-wrap break-all rounded-xl border bg-fd-card p-4 font-mono text-[0.8rem] leading-relaxed">
			<code>{JSON.stringify(fields, null, 2)}</code>
		</pre>
	);
}
