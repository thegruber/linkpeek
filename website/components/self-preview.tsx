"use client";
import { useEffect, useState } from "react";
import { appName, home, ogImagePath, previewApi, siteUrl } from "@/lib/shared";

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

interface CardData {
	url: string;
	title: string | null;
	description: string | null;
	image: string | null;
	host: string;
	local: boolean;
}

type Remote =
	| { state: "idle" }
	| { state: "loading"; url: string }
	| { state: "error"; message: string }
	| { state: "done"; card: CardData; ms: number };

/**
 * The hero: a URL in a chat message, unfurled into the card an app would
 * render. It starts with this page, parsed in the browser; visitors can try
 * any URL, which the rate-limited playground endpoint previews on Vercel.
 */
export function UnfurlDemo() {
	const { fields, ms } = useLivePreview();
	const [remote, setRemote] = useState<Remote>({ state: "idle" });
	const [input, setInput] = useState("");

	const own: CardData = {
		url: fields.canonicalUrl,
		title: fields.title,
		description: fields.description,
		image: `${basePath}${ogImagePath([])}`,
		host: new URL(fields.canonicalUrl).host,
		local: true,
	};
	const card = remote.state === "done" ? remote.card : own;

	async function submit(value: string) {
		const url = /^https?:\/\//i.test(value.trim())
			? value.trim()
			: `https://${value.trim()}`;
		setRemote({ state: "loading", url });
		try {
			const response = await fetch(
				`${previewApi}?url=${encodeURIComponent(url)}`,
			);
			if (response.status === 429) {
				setRemote({
					state: "error",
					message:
						"Too many previews from your network. Try again in a minute.",
				});
				return;
			}
			const data = await response.json();
			if (!response.ok) {
				setRemote({
					state: "error",
					message: data?.message ?? "This URL could not be previewed.",
				});
				return;
			}
			const canonical = String(data.canonicalUrl ?? url);
			setRemote({
				state: "done",
				ms: Number(data.ms) || 0,
				card: {
					url: canonical,
					title: data.title ?? null,
					description: data.description ?? null,
					image: data.image ?? null,
					host: new URL(canonical).host,
					local: false,
				},
			});
		} catch {
			setRemote({
				state: "error",
				message: "The preview service could not be reached.",
			});
		}
	}

	const status =
		remote.state === "loading"
			? "Fetching with linkpeek…"
			: remote.state === "error"
				? remote.message
				: remote.state === "done"
					? `Fetched and parsed by linkpeek in ${remote.ms} ms on a Vercel function. Results are cached for a day.`
					: ms === null
						? "\u00a0"
						: `Parsed from this page by linkpeek in ${ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms (median of 9 runs), in your browser.`;

	return (
		<div className="relative min-w-0">
			<form
				className="mb-3 flex gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					if (input.trim()) void submit(input);
				}}
			>
				<label htmlFor="try-url" className="sr-only">
					URL to preview
				</label>
				<input
					id="try-url"
					type="text"
					inputMode="url"
					autoComplete="url"
					spellCheck={false}
					maxLength={2048}
					placeholder="Try any URL, like github.com"
					value={input}
					onChange={(event) => setInput(event.target.value)}
					className="min-h-11 min-w-0 flex-1 rounded-xl border bg-fd-background px-4 text-sm outline-none transition-colors placeholder:text-fd-muted-foreground focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal-wash"
				/>
				<button
					type="submit"
					disabled={remote.state === "loading"}
					className="min-h-11 rounded-xl border bg-fd-background px-4 font-medium text-sm transition-colors hover:border-signal active:translate-y-px disabled:opacity-60"
				>
					Preview
				</button>
			</form>
			<div
				className="rounded-2xl border bg-fd-card p-4 shadow-[0_1px_0_rgb(0_0_0/0.02),0_24px_48px_-24px_rgb(18_20_26/0.18)] sm:p-5"
				aria-busy={remote.state === "loading"}
			>
				<p className="mb-3 w-fit max-w-full truncate rounded-2xl rounded-bl-md bg-fd-secondary px-3.5 py-2 text-sm">
					Have you seen{" "}
					<span className="text-signal">
						{(remote.state === "loading" ? remote.url : card.url).replace(
							/^https?:\/\//,
							"",
						)}
					</span>
					?
				</p>
				<a
					key={card.url}
					href={card.url}
					rel={card.local ? undefined : "nofollow noopener noreferrer ugc"}
					className={`unfurl group block overflow-hidden rounded-[14px] border bg-fd-background transition-[border-color,opacity] hover:border-signal ${remote.state === "loading" ? "opacity-50" : ""}`}
				>
					{card.image && (
						// biome-ignore lint/performance/noImgElement: static export; remote images are third-party
						<img
							src={card.image}
							alt=""
							width={1200}
							height={630}
							referrerPolicy="no-referrer"
							onError={(event) => {
								event.currentTarget.hidden = true;
							}}
							className="aspect-[1200/630] w-full border-b bg-fd-muted object-cover"
						/>
					)}
					<span className="grid gap-1 px-4 py-3.5">
						<span className="text-fd-muted-foreground text-xs">
							{card.host}
						</span>
						<strong className="line-clamp-2 font-semibold text-[0.95rem] leading-snug">
							{card.title ?? card.host}
						</strong>
						{card.description && (
							<span className="line-clamp-2 text-fd-muted-foreground text-sm leading-snug">
								{card.description}
							</span>
						)}
					</span>
				</a>
			</div>
			<p
				className={`mt-3 min-h-5 text-xs ${remote.state === "error" ? "text-fd-foreground" : "text-fd-muted-foreground"}`}
				aria-live="polite"
			>
				{status}
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
