"use client";
import { useEffect, useState } from "react";
import { appName, home, ogImagePath, siteUrl } from "@/lib/shared";

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

/** The same live result as JSON, next to the code that produces it. */
export function LiveResult({ className = "" }: { className?: string }) {
	const { fields } = useLivePreview();
	return (
		<pre
			className={`not-prose m-0 whitespace-pre-wrap [overflow-wrap:anywhere] border border-ink bg-fd-card p-5 font-mono text-[0.8rem] leading-relaxed ${className}`}
		>
			<code>{JSON.stringify(fields, null, 2)}</code>
		</pre>
	);
}
