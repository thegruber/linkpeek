import { preview } from "linkpeek";

// Real previews for the homepage strip, fetched by the published package when
// the site is built. Sites that time out or lack a title and image are left
// out, so a flaky network shortens the strip instead of breaking the build.
const SITES = [
	"https://github.com",
	"https://nodejs.org/en",
	"https://developer.mozilla.org/en-US/",
	"https://www.typescriptlang.org",
	"https://vercel.com",
	"https://bun.sh",
	"https://deno.com",
	"https://nextjs.org",
	"https://www.cloudflare.com",
	"https://astro.build",
	"https://vitejs.dev",
	"https://react.dev",
];

export interface ShowcaseCard {
	url: string;
	host: string;
	title: string;
	description: string | null;
	image: string;
	/** Bytes up to and including </head>, and of the whole HTML document. */
	headBytes: number;
	pageBytes: number;
}

let cached: Promise<ShowcaseCard[]> | undefined;

export function showcase(): Promise<ShowcaseCard[]> {
	cached ??= Promise.all(
		SITES.map(async (url): Promise<ShowcaseCard | null> => {
			try {
				const result = await preview(url, { timeout: 6000 });
				if (!result.title || !result.image || result.statusCode >= 400) {
					return null;
				}
				const [sizes, embeddable] = await Promise.all([
					measure(result.canonicalUrl),
					canEmbed(result.image),
				]);
				if (!sizes || !embeddable) return null;
				return {
					url: result.canonicalUrl,
					host: new URL(result.canonicalUrl).host.replace(/^www\./, ""),
					title: result.title,
					description: result.description,
					image: result.image,
					...sizes,
				};
			} catch {
				return null;
			}
		}),
	).then((cards) => cards.filter((card) => card !== null));
	return cached;
}

// Downloads the full document once to show how much of it is <head>: the
// part linkpeek reads before it cancels the stream.
async function measure(
	url: string,
): Promise<{ headBytes: number; pageBytes: number } | null> {
	const response = await fetch(url, {
		signal: AbortSignal.timeout(8000),
		headers: { "user-agent": "Twitterbot/1.0" },
	});
	if (!response.ok) return null;
	const bytes = new Uint8Array(await response.arrayBuffer());
	const text = new TextDecoder().decode(bytes);
	const end = text.search(/<\/head\s*>/i);
	if (end < 0) return null;
	const headBytes = new TextEncoder().encode(text.slice(0, end + 7)).length;
	return { headBytes, pageBytes: bytes.length };
}

// Some sites forbid cross-origin use of their images (Cross-Origin-Resource-
// Policy); those cards would render a broken image, so they are skipped.
async function canEmbed(image: string): Promise<boolean> {
	try {
		const response = await fetch(image, {
			method: "GET",
			signal: AbortSignal.timeout(6000),
		});
		await response.body?.cancel();
		const policy = response.headers.get("cross-origin-resource-policy");
		return (
			response.ok &&
			(response.headers.get("content-type") ?? "").startsWith("image/") &&
			(!policy || policy === "cross-origin")
		);
	} catch {
		return false;
	}
}
