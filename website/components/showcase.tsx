import { type ShowcaseCard, showcase } from "@/lib/showcase";

// A slow strip of real link previews, built by linkpeek when this page was
// generated. It pauses on hover and stands still under reduced motion.
export async function Showcase() {
	const cards = await showcase();
	if (cards.length < 4) return null;
	return (
		<section aria-labelledby="showcase-title" className="border-rule border-b">
			<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-rule border-b px-5 py-4 sm:px-8">
				<h2
					id="showcase-title"
					className="font-normal text-xl tracking-[-0.03em]"
				>
					Previewed by linkpeek when this page was built
				</h2>
				<p className="font-mono text-fd-muted-foreground text-xs">
					{cards.length} sites · how much of each page is &lt;head&gt;
				</p>
			</div>
			<div className="marquee group/marquee overflow-hidden">
				<ul className="marquee-track flex w-max">
					{/* The second copy makes the loop seamless; it is hidden from
					    assistive tech and the tab order. */}
					{(["first", "copy"] as const).flatMap((pass) =>
						cards.map((card) => (
							<Card
								key={`${pass}-${card.url}`}
								card={card}
								hidden={pass === "copy"}
							/>
						)),
					)}
				</ul>
			</div>
		</section>
	);
}

function Card({ card, hidden }: { card: ShowcaseCard; hidden: boolean }) {
	return (
		<li
			className="w-[19rem] shrink-0 border-rule border-r"
			aria-hidden={hidden || undefined}
		>
			<a
				href={card.url}
				rel="nofollow noopener noreferrer"
				tabIndex={hidden ? -1 : undefined}
				className="group/card block h-full transition-colors hover:bg-fd-card"
			>
				<span className="block overflow-hidden border-rule border-b bg-fd-muted">
					{/* biome-ignore lint/performance/noImgElement: third-party Open Graph images */}
					<img
						src={card.image}
						alt=""
						width={1200}
						height={630}
						loading="lazy"
						decoding="async"
						referrerPolicy="no-referrer"
						className="aspect-[1200/630] w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/card:scale-[1.03]"
					/>
				</span>
				<span className="grid gap-1 px-4 py-3.5">
					<span className="flex items-center justify-between gap-3 font-mono text-[0.7rem] text-fd-muted-foreground">
						<span className="truncate">{card.host}</span>
						<span className="figures shrink-0">
							<span className="text-signal">{kb(card.headBytes)}</span> /{" "}
							{kb(card.pageBytes)}
						</span>
					</span>
					<strong className="line-clamp-1 font-medium text-[0.92rem] tracking-tight">
						{card.title}
					</strong>
					{card.description && (
						<span className="line-clamp-2 text-fd-muted-foreground text-xs leading-snug">
							{card.description}
						</span>
					)}
				</span>
				<HeadShare head={card.headBytes} page={card.pageBytes} />
			</a>
		</li>
	);
}

// The head's share of the page as a bar: the blue part is what linkpeek reads.
function HeadShare({ head, page }: { head: number; page: number }) {
	const share = Math.max(0.01, Math.min(1, head / page));
	return (
		<span
			className="mx-4 mb-4 block h-1.5 bg-bar"
			role="img"
			aria-label={`The head is ${Math.round(share * 100)} percent of the page`}
		>
			<span
				className="block h-full bg-signal"
				style={{ width: `${(share * 100).toFixed(1)}%` }}
			/>
		</span>
	);
}

function kb(bytes: number): string {
	return bytes < 100_000
		? `${(bytes / 1000).toFixed(1)} kB`
		: `${Math.round(bytes / 1000)} kB`;
}
