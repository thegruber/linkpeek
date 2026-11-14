import { ImageResponse } from "next/og";
import { highlights } from "@/lib/benchmarks";
import { home } from "@/lib/shared";
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
	const description = page?.data.description ?? home.description;
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
				justifyContent: "space-between",
				padding: "72px 80px",
				background: "#0d0f14",
				color: "#eceef3",
				fontFamily: fonts.length ? "Grotesk" : undefined,
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
				<svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
					<rect width="64" height="64" rx="12" fill="#165dff" />
					<path
						d="m26 18-14 14 14 14m12-28 14 14-14 14"
						fill="none"
						stroke="#fff"
						strokeWidth="7"
					/>
				</svg>
				<span style={{ fontSize: 34, fontWeight: 600 }}>linkpeek</span>
				<span style={{ fontSize: 26, color: "#9aa1b0", marginLeft: 12 }}>
					{section}
				</span>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<div
					style={{
						fontSize: title.length > 34 ? 66 : 80,
						fontWeight: 600,
						lineHeight: 1.05,
						letterSpacing: "-0.03em",
						maxWidth: 980,
					}}
				>
					{title}
				</div>
				<div
					style={{
						fontSize: 28,
						lineHeight: 1.4,
						color: "#9aa1b0",
						maxWidth: 940,
					}}
				>
					{description}
				</div>
			</div>
			<div
				style={{
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
