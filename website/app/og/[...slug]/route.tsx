import { ImageResponse } from "next/og";
import { highlights } from "@/lib/benchmarks";
import { source } from "@/lib/source";

export const dynamic = "force-static";
export const dynamicParams = false;

// Social cards are generated per page at build time, so a shared link to the
// benchmarks shows "Link preview benchmarks", not a generic site image.
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ slug: string[] }> },
) {
	const { slug } = await params;
	const slugs = slug.slice(0, -1);
	const page = slugs.length ? source.getPage(slugs) : undefined;
	if (slugs.length && !page) return new Response(null, { status: 404 });
	const title = page
		? (page.data.heading ?? page.data.metaTitle ?? page.data.title)
		: "Fast, safe link previews for TypeScript";
	const description =
		page?.data.description ??
		"Open Graph, Twitter Card and JSON-LD metadata from any URL. Reads only the head, blocks private addresses, one dependency.";
	const section = page
		? page.slugs[0] === "integrations"
			? "Integration guide"
			: page.slugs[0] === "guides"
				? "Guide"
				: "Documentation"
		: highlights()
				.slice(0, 2)
				.map((item) => item.value)
				.join("  ·  ");
	const fonts = await loadFonts();

	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				position: "relative",
				padding: "64px 80px 0",
				background: "#0d0f14",
				color: "#eceef3",
				fontFamily: fonts.length ? "Grotesk" : undefined,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 18 }}>
				<svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
					<rect width="64" height="64" rx="15" fill="#165dff" />
					<g transform="translate(0 -2) rotate(-8 32 40)">
						<circle cx="35" cy="26" r="7.5" fill="#fff" />
						<circle cx="50.5" cy="26" r="7.5" fill="#fff" />
						<circle cx="33.4" cy="28.2" r="3.2" fill="#0a1a4f" />
						<circle cx="48.9" cy="28.2" r="3.2" fill="#0a1a4f" />
						<rect
							x="7"
							y="29.5"
							width="50"
							height="26"
							rx="6"
							fill="#fff"
							stroke="#165dff"
							strokeWidth="3"
						/>
						<rect
							x="12.5"
							y="35"
							width="12"
							height="15"
							rx="3"
							fill="#b4c8ff"
						/>
						<rect
							x="28.5"
							y="36.5"
							width="21"
							height="4"
							rx="2"
							fill="#165dff"
						/>
						<rect
							x="28.5"
							y="44"
							width="13"
							height="3.5"
							rx="1.75"
							fill="#b4c8ff"
						/>
					</g>
				</svg>
				<span
					style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.035em" }}
				>
					linkpeek
				</span>
				<span style={{ fontSize: 26, color: "#9aa1b0", marginLeft: 14 }}>
					{section}
				</span>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 22,
					marginTop: 64,
				}}
			>
				<div
					style={{
						fontSize: title.length > 34 ? 64 : 78,
						fontWeight: 600,
						lineHeight: 1.04,
						letterSpacing: "-0.035em",
						maxWidth: 900,
					}}
				>
					{title}
				</div>
				<div
					style={{
						fontSize: 27,
						lineHeight: 1.4,
						color: "#9aa1b0",
						maxWidth: 820,
					}}
				>
					{description}
				</div>
			</div>
			{/* The </head> edge with the eyes peeking over it. */}
			<svg
				width="176"
				height="88"
				viewBox="0 0 48 24"
				aria-hidden="true"
				style={{ position: "absolute", right: 96, bottom: 102 }}
			>
				<path
					fill="#fff"
					stroke="#165dff"
					strokeWidth="2.5"
					d="M1.5 24a10.5 10.5 0 0 1 21 0zM25.5 24a10.5 10.5 0 0 1 21 0z"
				/>
				<circle cx="10" cy="20" r="3.8" fill="#0a1a4f" />
				<circle cx="34" cy="20" r="3.8" fill="#0a1a4f" />
			</svg>
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 96,
					height: 6,
					background: "#165dff",
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 80,
					right: 80,
					bottom: 34,
					display: "flex",
					justifyContent: "space-between",
					fontSize: 24,
					color: "#9aa1b0",
				}}
			>
				<span style={{ color: "#7b9bff" }}>npm install linkpeek</span>
				<span>Node.js · Bun · Deno · Edge</span>
			</div>
		</div>,
		{ width: 1200, height: 630, fonts },
	);
}

export function generateStaticParams() {
	return [
		{ slug: ["image.png"] },
		...source
			.getPages()
			.map((page) => ({ slug: [...page.slugs, "image.png"] })),
	];
}

type Font = {
	name: string;
	data: ArrayBuffer;
	weight: 400 | 600;
	style: "normal";
};

let fontCache: Promise<Font[]> | undefined;

// Google Fonts serves TrueType to clients that do not announce WOFF2 support.
// Without network access the images fall back to the default font.
function loadFonts(): Promise<Font[]> {
	fontCache ??= Promise.all(
		([400, 600] as const).map(async (weight) => {
			const css = await fetch(
				`https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@${weight}`,
			).then((response) => response.text());
			const url = css.match(/src: url\((.+?)\)/)?.[1];
			if (!url) throw new Error("font URL not found");
			const data = await fetch(url).then((response) => response.arrayBuffer());
			return { name: "Grotesk", data, weight, style: "normal" as const };
		}),
	).catch(() => []);
	return fontCache;
}
