// Checks the exported site the way crawlers and readers meet it: every page
// has one H1, a self-canonical URL, social tags whose image exists, valid
// JSON-LD and a Markdown twin; every internal link and sitemap entry lands.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DomUtils, parseDocument } from "htmlparser2";

const out = resolve(import.meta.dirname, "..", "out");
const origin = (
	process.env.LINKPEEK_DOCS_ORIGIN ?? "https://thegruber.github.io"
).replace(/\/$/, "");
const base =
	`/${(process.env.LINKPEEK_DOCS_BASE ?? "/linkpeek/").replace(/^\/+|\/+$/g, "")}/`.replace(
		"//",
		"/",
	);
const site = `${origin}${base}`;
const failures = [];
const fail = (file, message) => failures.push(`${file}: ${message}`);

const pages = readdirSync(out, { recursive: true }).filter(
	(file) =>
		typeof file === "string" &&
		file.endsWith("index.html") &&
		!file.startsWith("_not-found") &&
		!file.startsWith("404"),
);
if (pages.length < 12)
	fail("out", `expected at least 12 pages, found ${pages.length}`);

// Resolve a site URL or base-relative path to the exported file.
function target(url) {
	if (!url.startsWith(site) && !url.startsWith(base)) return null;
	const path = decodeURIComponent(
		url.startsWith(site) ? url.slice(site.length) : url.slice(base.length),
	)
		.split("#")[0]
		.split("?")[0];
	const file = join(out, path);
	return path === "" || path.endsWith("/") ? join(file, "index.html") : file;
}

const meta = (document, attr, value) =>
	DomUtils.findOne(
		(node) => node.name === "meta" && node.attribs[attr] === value,
		document.children,
	)?.attribs.content;

for (const file of pages) {
	const document = parseDocument(readFileSync(join(out, file), "utf8"));
	const route = file.replace(/index\.html$/, "");
	const expected = `${site}${route}`;
	const elements = DomUtils.getElementsByTagName("*", document);

	const h1 = elements.filter((node) => node.name === "h1");
	if (h1.length !== 1) fail(file, `expected one h1, found ${h1.length}`);

	const links = elements.filter((node) => node.name === "link");
	const canonical = links.find((node) => node.attribs.rel === "canonical");
	if (canonical?.attribs.href !== expected)
		fail(file, `canonical ${canonical?.attribs.href} should be ${expected}`);
	const markdown = links.find(
		(node) =>
			node.attribs.rel === "alternate" && node.attribs.type === "text/markdown",
	);
	if (markdown?.attribs.href !== `${expected}index.md`)
		fail(file, `markdown alternate ${markdown?.attribs.href}`);
	else if (!existsSync(target(markdown.attribs.href)))
		fail(file, `missing ${markdown.attribs.href}`);

	for (const property of [
		"og:title",
		"og:description",
		"og:site_name",
		"og:url",
		"og:image",
	]) {
		if (!meta(document, "property", property))
			fail(file, `missing ${property}`);
	}
	if (meta(document, "property", "og:url") !== expected)
		fail(file, `og:url ${meta(document, "property", "og:url")}`);
	const image = meta(document, "property", "og:image");
	if (image && !existsSync(target(image) ?? ""))
		fail(file, `missing og:image ${image}`);
	if (!meta(document, "name", "description")) fail(file, "missing description");
	if (meta(document, "name", "twitter:card") !== "summary_large_image")
		fail(file, "missing twitter:card");

	const jsonLd = elements.filter(
		(node) =>
			node.name === "script" && node.attribs.type === "application/ld+json",
	);
	if (!jsonLd.length) fail(file, "missing JSON-LD");
	for (const script of jsonLd) {
		try {
			JSON.parse(DomUtils.textContent(script));
		} catch {
			fail(file, "invalid JSON-LD");
		}
	}

	for (const anchor of elements.filter(
		(node) => node.name === "a" && node.attribs.href,
	)) {
		const href = anchor.attribs.href;
		const path = target(
			href.startsWith("/") || href.startsWith("http")
				? href
				: `${base}${route}${href}`,
		);
		if (path && !existsSync(path)) fail(file, `broken link ${href}`);
	}
}

const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
for (const loc of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
	if (!existsSync(target(loc[1]) ?? ""))
		fail("sitemap.xml", `missing ${loc[1]}`);
}
for (const file of pages) {
	if (
		!sitemap.includes(`<loc>${site}${file.replace(/index\.html$/, "")}</loc>`)
	)
		fail("sitemap.xml", `does not list ${file}`);
}
const llms = readFileSync(join(out, "llms.txt"), "utf8");
for (const link of llms.matchAll(/\]\((https?:[^)]+)\)/g)) {
	const path = target(link[1]);
	if (path && !existsSync(path)) fail("llms.txt", `broken link ${link[1]}`);
}

if (failures.length) {
	console.error(failures.join("\n"));
	process.exit(1);
}
console.log(
	`Checked ${pages.length} pages: canonical, social, JSON-LD, Markdown, links and sitemap.`,
);
