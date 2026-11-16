// Site-wide constants. The site is served from GitHub Pages at linkpeek.js.org;
// every absolute URL is built from the origin plus the base path.
export const appName = "linkpeek";
export const siteOrigin = (
	process.env.LINKPEEK_DOCS_ORIGIN ?? "https://linkpeek.js.org"
).replace(/\/$/, "");
// NEXT_PUBLIC_BASE_PATH is set in next.config and inlined into client code,
// so server and browser agree on the base path; plain env vars are not.
export const basePath = normalizeBase(
	process.env.NEXT_PUBLIC_BASE_PATH ?? process.env.LINKPEEK_DOCS_BASE ?? "/",
);
export const siteUrl = `${siteOrigin}${basePath}`;
export const repository = "https://github.com/thegruber/linkpeek";
export const npmUrl = "https://www.npmjs.com/package/linkpeek";
export const author = "Adrian Gruber";

/** Rate-limited preview endpoint (demo-api/ in this repository, on Vercel). */
export const previewApi =
	process.env.NEXT_PUBLIC_PREVIEW_API ??
	"https://linkpeek-playground.vercel.app/api/preview";

export const home = {
	title: "TypeScript link preview library",
	description:
		"Fast, safe link preview library and URL unfurler for TypeScript. Extracts Open Graph, Twitter Card and JSON-LD metadata on Node.js, Bun, Deno and the edge.",
};

export const openGraphDefaults = {
	siteName: appName,
	locale: "en_US",
} as const;

/** Absolute URL for a site path such as `/api/` or `api/`. */
export function absoluteUrl(path: string): string {
	return `${siteUrl}${path.replace(/^\//, "")}`;
}

/** Path of the generated social image for a page's slugs. */
export function ogImagePath(slugs: string[]): string {
	return `/og/${[...slugs, "image.png"].join("/")}`;
}

function normalizeBase(value: string): string {
	const path = value.replace(/^\/+|\/+$/g, "");
	return path ? `/${path}/` : "/";
}
