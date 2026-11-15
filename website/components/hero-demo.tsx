"use client";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { TextMorph } from "torph/react";
import { PeekingEyes } from "@/components/gaze";
import { type CheckInput, previewChecks } from "@/lib/preview-checks";
import { previewApi } from "@/lib/shared";
import type { ShowcaseCard } from "@/lib/showcase";

interface Card extends CheckInput {
	url: string;
	host: string;
}

type State =
	| { kind: "example"; index: number }
	| { kind: "loading"; url: string }
	| { kind: "error"; message: string }
	| { kind: "result"; card: Card; ms: number; age: number };

const ROTATE_MS = 3600;

/**
 * The hero: a URL field and the card linkpeek builds from it. It opens on
 * real previews made when the site was built and cycles through them until
 * the visitor touches it; any URL they enter goes to the rate-limited demo
 * endpoint.
 */
export function HeroDemo({
	examples,
	capturedLabel,
	className = "",
	codeClassName = "",
}: {
	examples: ShowcaseCard[];
	/** When the examples were captured, i.e. when the site was built. */
	capturedLabel: string;
	/** Grid cell of the demo. */
	className?: string;
	/** Grid cell of the code that produced the card. */
	codeClassName?: string;
}) {
	const [state, setState] = useState<State>(
		examples.length
			? { kind: "example", index: 0 }
			: { kind: "error", message: "Enter a URL to preview it." },
	);
	const [input, setInput] = useState("");
	const touched = useRef(false);

	// The progress line is the clock: when its animation ends, the next
	// example shows. Hovering or focusing the demo pauses it.
	const [paused, setPaused] = useState(false);
	const [rotating, setRotating] = useState(false);
	const firstCard = useRef(true);
	useEffect(() => {
		setRotating(
			examples.length > 1 &&
				!matchMedia("(prefers-reduced-motion: reduce)").matches,
		);
	}, [examples.length]);
	useEffect(() => {
		if (state.kind === "example" && state.index > 0) firstCard.current = false;
		if (state.kind !== "example") firstCard.current = false;
	}, [state]);
	const next = () => {
		if (touched.current) return;
		setState((current) =>
			current.kind === "example"
				? { kind: "example", index: (current.index + 1) % examples.length }
				: current,
		);
	};

	const example = state.kind === "example" ? examples[state.index] : undefined;
	const lastCard = useRef<Card | undefined>(undefined);
	const card: Card | undefined =
		state.kind === "result"
			? state.card
			: state.kind === "loading"
				? lastCard.current
				: example;
	lastCard.current = card;
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
				// v names the response shape, so older edge-cached answers are skipped.
				`${previewApi}?url=${encodeURIComponent(url)}&v=2`,
			);
			if (response.status === 429) {
				setState({
					kind: "error",
					message: "Too many previews. Try again in a minute.",
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
				// Seconds since linkpeek fetched it; the endpoint caches for a day.
				age: Math.max(
					0,
					(Date.now() - Date.parse(data.fetchedAt ?? "")) / 1000 || 0,
				),
				card: {
					url: canonical,
					host: new URL(canonical).host.replace(/^www\./, ""),
					title: data.title ?? null,
					description: data.description ?? null,
					image: data.image ?? null,
					imageAlt: data.imageAlt ?? null,
					twitterCard: data.twitterCard ?? null,
					favicon: data.favicon ?? null,
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
					? state.age < 120
						? `Live · fetched just now · ${state.ms} ms`
						: `Live · cached ${ago(state.age)} · ${state.ms} ms`
					: example
						? `Read ${kb(example.headBytes)} of ${kb(example.pageBytes)}, then stopped`
						: "";

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: hover and focus only pause the example rotation */}
			<div
				className={`demo flex min-w-0 flex-col bg-fd-background ${className}`}
				data-paused={paused || undefined}
				onPointerEnter={() => setPaused(true)}
				onPointerLeave={() => setPaused(false)}
				onFocus={() => setPaused(true)}
				onBlur={() => setPaused(false)}
			>
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
						placeholder="Paste any URL to preview it live"
						value={shownUrl}
						onFocus={(event) => {
							touched.current = true;
							event.currentTarget.select();
						}}
						onChange={(event) => setInput(event.target.value)}
						className="min-h-14 min-w-0 flex-1 bg-transparent px-4 font-mono text-[0.95rem] placeholder:text-fd-muted-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
					/>
					<button
						type="submit"
						disabled={state.kind === "loading"}
						className="press group flex min-h-14 items-center justify-between gap-3 bg-mark px-5 font-mono text-[0.72rem] text-ink uppercase tracking-[0.06em] transition-[background-color,color,transform] hover:bg-ink hover:text-white disabled:opacity-60 lg:w-40"
					>
						Preview
						<svg
							viewBox="0 0 16 16"
							aria-hidden="true"
							className="hidden size-4 sm:block"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M3 8h10M9 4l4 4-4 4" />
						</svg>
					</button>
				</form>

				<div
					className="relative grid flex-1 content-center gap-4 bg-fd-card px-4 pt-4 pb-9 sm:px-6 sm:pt-6 sm:pb-10"
					aria-busy={state.kind === "loading"}
				>
					{card ? (
						<a
							key={card.url}
							href={card.url}
							rel="nofollow noopener noreferrer ugc"
							className={`${firstCard.current ? "unfurl" : "swap"} grid border border-ink bg-fd-background transition-opacity sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] ${state.kind === "loading" ? "opacity-40" : ""}`}
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
									className="aspect-[1200/630] h-full w-full border-ink border-b bg-fd-muted object-cover sm:border-r sm:border-b-0"
								/>
							)}
							<span className="grid content-center gap-1.5 px-4 py-4">
								<span className="font-mono text-fd-muted-foreground text-xs">
									{card.host}
								</span>
								<strong className="line-clamp-2 font-medium text-[1.05rem] leading-snug tracking-tight">
									{card.title ?? card.host}
								</strong>
								{card.description && (
									<span className="line-clamp-3 text-fd-muted-foreground text-sm leading-snug">
										{card.description}
									</span>
								)}
							</span>
						</a>
					) : null}
					{card && <Checks key={card.url} card={card} />}
					{!card && (
						<div className="grid aspect-[1200/630] place-items-center border border-rule border-dashed text-fd-muted-foreground text-sm">
							The preview card appears here.
						</div>
					)}
					{/* The brand's eyes peek over the status line and read while linkpeek fetches. */}
					<PeekingEyes
						outline="var(--color-ink)"
						scanning={state.kind === "loading"}
						className="absolute right-4 bottom-0 w-12 translate-y-px sm:right-6 sm:w-16"
					/>
				</div>

				<p
					className={`relative flex min-h-11 min-w-0 items-center justify-between gap-4 border-ink border-t px-4 py-3 font-mono text-xs ${state.kind === "error" ? "text-fd-foreground" : "text-fd-muted-foreground"}`}
					aria-live={state.kind === "example" ? "off" : "polite"}
				>
					{/* Errors can be long, so they wrap instead of morphing on one line. */}
					{state.kind === "error" ? (
						<span className="min-w-0">{status}</span>
					) : (
						<TextMorph
							as="span"
							duration={280}
							ease="cubic-bezier(0.23, 1, 0.32, 1)"
							respectReducedMotion
						>
							{status}
						</TextMorph>
					)}
					{state.kind === "example" && (
						<>
							<span className="hidden sm:inline">
								snapshot {state.index + 1}/{examples.length} · {capturedLabel}
							</span>
							{/* Time until the next example; it stops once the visitor takes over. */}
							<span
								key={state.index}
								aria-hidden="true"
								className={`rotate-progress absolute top-[-1px] left-0 h-[3px] w-full bg-mark ${rotating ? "" : "hidden"}`}
								style={{
									animationDuration: `${ROTATE_MS}ms`,
									animationDelay: state.index === 0 ? "600ms" : "0ms",
								}}
								onAnimationEnd={next}
							/>
						</>
					)}
				</p>
			</div>
			<CodeCell
				className={codeClassName}
				url={state.kind === "loading" ? state.url : card?.url}
				card={state.kind === "loading" ? undefined : card}
				error={state.kind === "error" ? state.message : undefined}
			/>
		</>
	);
}

// The call that produced the card next to it, with the values it returned.
function CodeCell({
	className,
	url,
	card,
	error,
}: {
	className: string;
	url: string | undefined;
	card: Card | undefined;
	error: string | undefined;
}) {
	// Always three lines, so the cell keeps its height between states.
	const note = (text: string) => (
		<span className="text-fd-muted-foreground">{`// ${text}`}</span>
	);
	const lines = card
		? (
				[
					["title", card.title],
					["description", card.description],
					["image", card.image],
				] as const
			).map(([key, value]) => (
				<>
					{`card.${key.padEnd(12, "\u00a0")}`}
					{note(value === null ? "null" : JSON.stringify(value))}
				</>
			))
		: [note(error ?? "reading the <head>…"), null, null];
	return (
		<div
			className={`flex min-w-0 flex-col justify-center gap-4 px-5 py-7 sm:px-8 ${className}`}
		>
			<p className="font-mono text-[0.72rem] text-fd-muted-foreground uppercase tracking-[0.06em]">
				server.ts
			</p>
			<pre className="m-0 grid min-w-0 font-mono text-[0.82rem] leading-[1.7] sm:text-[0.9rem]">
				<code className="grid min-w-0">
					<span className="block truncate">
						<span className="text-fd-muted-foreground">import</span>{" "}
						{"{ preview }"}{" "}
						<span className="text-fd-muted-foreground">from</span> "linkpeek";
					</span>
					<span className="block h-[1.7em]" />
					<span className="block truncate">
						<span className="text-fd-muted-foreground">const</span> card ={" "}
						<span className="text-fd-muted-foreground">await</span> preview(
						<span className="bg-block">"{url ?? "https://…"}"</span>);
					</span>
					<span className="block h-[1.7em]" />
					{lines.map((line, index) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed three-line slot
							key={index}
							className="block truncate"
						>
							{line}
						</span>
					))}
				</code>
			</pre>
		</div>
	);
}

// What linkpeek found, as plain presence checks on the fields Slack, X,
// iMessage and LinkedIn read to draw the card.
function Checks({ card }: { card: CheckInput }) {
	const checks = previewChecks(card);
	const found = checks.filter((check) => check.ok).length;
	return (
		<div className="border border-ink font-mono text-[0.7rem]">
			<p className="flex items-center justify-between gap-3 border-ink border-b px-3 py-2">
				<span className="uppercase tracking-[0.06em]">Preview tags</span>
				<span>
					{found}/{checks.length} found
				</span>
			</p>
			<ul className="grid grid-cols-2 gap-px bg-ink sm:grid-cols-3">
				{checks.map((check, index) => (
					<li
						key={check.label}
						className="flex items-center gap-2 bg-fd-background px-3 py-2"
					>
						<span
							aria-hidden="true"
							data-ok={check.ok || undefined}
							style={{ "--i": index } as React.CSSProperties}
							className={`tag-dot size-2 shrink-0 ${check.ok ? "bg-mark" : "border border-ink"}`}
						/>
						<span className={check.ok ? "" : "text-fd-muted-foreground"}>
							{check.label}
						</span>
						<span className="sr-only">{check.ok ? "found" : "missing"}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

function ago(seconds: number): string {
	const minutes = Math.round(seconds / 60);
	return minutes < 60
		? `${minutes} min ago`
		: `${Math.round(minutes / 60)} h ago`;
}

function kb(bytes: number): string {
	return bytes < 100_000
		? `${(bytes / 1000).toFixed(1)} kB`
		: `${Math.round(bytes / 1000)} kB`;
}
