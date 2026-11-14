"use client";
import { useEffect, useRef, useState } from "react";
import { TextMorph } from "torph/react";
import { previewApi } from "@/lib/shared";
import type { ShowcaseCard } from "@/lib/showcase";

interface Card {
	url: string;
	host: string;
	title: string | null;
	description: string | null;
	image: string | null;
}

type State =
	| { kind: "example"; index: number }
	| { kind: "loading"; url: string }
	| { kind: "error"; message: string }
	| { kind: "result"; card: Card; ms: number };

const ROTATE_MS = 3600;

/**
 * The hero: a URL field and the card linkpeek builds from it. It opens on
 * real previews made when the site was built and cycles through them until
 * the visitor touches it; any URL they enter goes to the rate-limited demo
 * endpoint.
 */
export function HeroDemo({ examples }: { examples: ShowcaseCard[] }) {
	const [state, setState] = useState<State>(
		examples.length
			? { kind: "example", index: 0 }
			: { kind: "error", message: "Enter a URL to preview it." },
	);
	const [input, setInput] = useState("");
	const touched = useRef(false);

	useEffect(() => {
		if (
			examples.length < 2 ||
			matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			return;
		}
		const timer = setInterval(() => {
			if (touched.current) return;
			setState((current) =>
				current.kind === "example"
					? { kind: "example", index: (current.index + 1) % examples.length }
					: current,
			);
		}, ROTATE_MS);
		return () => clearInterval(timer);
	}, [examples.length]);

	const example = state.kind === "example" ? examples[state.index] : undefined;
	const card: Card | undefined = state.kind === "result" ? state.card : example;
	const shownUrl =
		input ||
		(state.kind === "loading"
			? state.url
			: (card?.url.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? ""));

	async function submit(value: string) {
		touched.current = true;
		const url = /^https?:\/\//i.test(value.trim())
			? value.trim()
			: `https://${value.trim()}`;
		setState({ kind: "loading", url });
		try {
			const response = await fetch(
				`${previewApi}?url=${encodeURIComponent(url)}`,
			);
			if (response.status === 429) {
				setState({
					kind: "error",
					message:
						"Too many previews from your network. Try again in a minute.",
				});
				return;
			}
			const data = await response.json();
			if (!response.ok) {
				setState({
					kind: "error",
					message: data?.message ?? "This URL could not be previewed.",
				});
				return;
			}
			const canonical = String(data.canonicalUrl ?? url);
			setState({
				kind: "result",
				ms: Number(data.ms) || 0,
				card: {
					url: canonical,
					host: new URL(canonical).host.replace(/^www\./, ""),
					title: data.title ?? null,
					description: data.description ?? null,
					image: data.image ?? null,
				},
			});
		} catch {
			setState({
				kind: "error",
				message: "The preview service could not be reached.",
			});
		}
	}

	const status =
		state.kind === "loading"
			? "Fetching with linkpeek…"
			: state.kind === "error"
				? state.message
				: state.kind === "result"
					? `Fetched and parsed in ${state.ms} ms`
					: example
						? `Read ${kb(example.headBytes)} of ${kb(example.pageBytes)}, then stopped`
						: "";

	return (
		<div className="flex h-full min-w-0 flex-col bg-fd-background">
			<form
				className="flex border-ink border-b"
				onSubmit={(event) => {
					event.preventDefault();
					if (shownUrl.trim()) void submit(input || shownUrl);
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
					placeholder="Paste any URL"
					value={shownUrl}
					onFocus={() => {
						touched.current = true;
					}}
					onChange={(event) => setInput(event.target.value)}
					className="min-h-14 min-w-0 flex-1 bg-transparent px-4 font-mono text-[0.95rem] outline-none placeholder:text-fd-muted-foreground focus-visible:bg-fd-card"
				/>
				<button
					type="submit"
					disabled={state.kind === "loading"}
					className="press min-h-14 bg-ink px-6 font-mono text-[0.72rem] text-white uppercase tracking-[0.06em] transition-[background-color,color,transform] hover:bg-mark hover:text-ink disabled:opacity-60"
				>
					Preview
				</button>
			</form>

			<div
				className="flex-1 bg-fd-card p-4 sm:p-6"
				aria-busy={state.kind === "loading"}
			>
				{card ? (
					<a
						key={card.url}
						href={card.url}
						rel="nofollow noopener noreferrer ugc"
						className={`unfurl block border border-ink bg-fd-background transition-opacity ${state.kind === "loading" ? "opacity-40" : ""}`}
					>
						{card.image && (
							// biome-ignore lint/performance/noImgElement: third-party Open Graph images
							<img
								src={card.image}
								alt=""
								width={1200}
								height={630}
								referrerPolicy="no-referrer"
								onError={(event) => {
									event.currentTarget.hidden = true;
								}}
								className="aspect-[1200/630] max-h-64 w-full border-ink border-b bg-fd-muted object-cover"
							/>
						)}
						<span className="grid gap-1 px-4 py-3.5">
							<span className="font-mono text-fd-muted-foreground text-xs">
								{card.host}
							</span>
							<strong className="line-clamp-1 font-medium text-[1rem] tracking-tight">
								{card.title ?? card.host}
							</strong>
							{card.description && (
								<span className="line-clamp-2 text-fd-muted-foreground text-sm leading-snug">
									{card.description}
								</span>
							)}
						</span>
					</a>
				) : (
					<div className="grid aspect-[1200/630] place-items-center border border-rule border-dashed text-fd-muted-foreground text-sm">
						The preview card appears here.
					</div>
				)}
			</div>

			<p
				className={`flex min-h-11 items-center justify-between gap-4 border-ink border-t px-4 py-3 font-mono text-xs ${state.kind === "error" ? "text-fd-foreground" : "text-fd-muted-foreground"}`}
				aria-live="polite"
			>
				<TextMorph
					as="span"
					duration={420}
					ease="cubic-bezier(0.23, 1, 0.32, 1)"
					respectReducedMotion
				>
					{status}
				</TextMorph>
				{state.kind === "example" && (
					<span className="hidden sm:inline">example, built with linkpeek</span>
				)}
			</p>
		</div>
	);
}

function kb(bytes: number): string {
	return bytes < 100_000
		? `${(bytes / 1000).toFixed(1)} kB`
		: `${Math.round(bytes / 1000)} kB`;
}
