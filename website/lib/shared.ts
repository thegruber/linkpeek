// Site-wide constants. The site is served from GitHub Pages under a project
// path, so every absolute URL is built from the origin plus the base path.
export const appName = "linkpeek";
export const siteOrigin = (
	process.env.LINKPEEK_DOCS_ORIGIN ?? "https://thegruber.github.io"
).replace(/\/$/, "");
export const basePath = normalizeBase(
	process.env.LINKPEEK_DOCS_BASE ?? "/linkpeek/",
);
export const siteUrl = `${siteOrigin}${basePath}`;
export const repository = "https://github.com/thegruber/linkpeek";
export const npmUrl = "https://www.npmjs.com/package/linkpeek";
export const author = "Adrian Gruber";

export const home = {
	title: "TypeScript link preview library",
	description:
		"Fast, safe TypeScript link preview library and URL metadata extractor for Open Graph, Twitter Cards, and JSON-LD on Node.js, Bun, Deno, and edge runtimes.",
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
