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
		: "Turn any URL into a link preview.";
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
				background: "#ffffff",
				color: "#232323",
				fontFamily: fonts.length ? "Grotesk" : undefined,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 18 }}>
				<svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
					<rect width="64" height="64" fill="#232323" />
					<rect y="45" width="64" height="19" fill="#ff5b1f" />
					<path
						d="M8 45a11.5 11.5 0 0 1 23 0zM33 45a11.5 11.5 0 0 1 23 0z"
						fill="#ffffff"
					/>
					<circle cx="23.5" cy="38.5" r="4.6" fill="#232323" />
					<circle cx="48.5" cy="38.5" r="4.6" fill="#232323" />
				</svg>
				<span
					style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-0.035em" }}
				>
					linkpeek
				</span>
				<span style={{ fontSize: 26, color: "#5c616b", marginLeft: 14 }}>
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
						display: "flex",
						fontSize: title.length > 34 ? 64 : 78,
						fontWeight: 500,
						lineHeight: 1.04,
						letterSpacing: "-0.035em",
						maxWidth: 900,
					}}
				>
					{page ? (
						title
					) : (
						<span style={{ display: "flex", flexWrap: "wrap" }}>
							Turn any URL into a&nbsp;
							<span style={{ background: "#ff5b1f", padding: "0 10px" }}>
								link preview
							</span>
							.
						</span>
					)}
				</div>
				<div
					style={{
						fontSize: 27,
						lineHeight: 1.4,
						color: "#5c616b",
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
					d="M1.5 24a10.5 10.5 0 0 1 21 0zM25.5 24a10.5 10.5 0 0 1 21 0z"
					fill="#ffffff"
					stroke="#232323"
					strokeWidth="2"
				/>
				<circle cx="15" cy="17.5" r="4" fill="#232323" />
				<circle cx="39" cy="17.5" r="4" fill="#232323" />
			</svg>
			<div
				style={{
					position: "absolute",
					left: 0,
					right: 0,
					bottom: 96,
					height: 6,
					background: "#ff5b1f",
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
					color: "#5c616b",
				}}
			>
				<span
					style={{
						color: "#232323",
						background: "#ff5b1f",
						padding: "2px 8px",
					}}
				>
					npm install linkpeek
				</span>
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
	weight: 400 | 500;
	style: "normal";
};

let fontCache: Promise<Font[]> | undefined;

// Google Fonts serves TrueType to clients that do not announce WOFF2 support.
// Without network access the images fall back to the default font.
function loadFonts(): Promise<Font[]> {
	fontCache ??= Promise.all(
		([400, 500] as const).map(async (weight) => {
			const css = await fetch(
				`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}`,
			).then((response) => response.text());
			const url = css.match(/src: url\((.+?)\)/)?.[1];
			if (!url) throw new Error("font URL not found");
			const data = await fetch(url).then((response) => response.arrayBuffer());
			return { name: "Grotesk", data, weight, style: "normal" as const };
		}),
	).catch(() => []);
	return fontCache;
}
