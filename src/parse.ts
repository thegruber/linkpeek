import { Parser } from "htmlparser2";
import { resolveHttpUrl } from "./resolve.js";
import type { PreviewOptions, PreviewResult } from "./types.js";

const FALLBACK_BASE_URL = "https://example.com/";

// Elements allowed inside <head>. The first tag outside this set marks the
// implicit start of <body> for documents that omit <head>/<body> tags.
const HEAD_TAGS = new Set([
	"html",
	"head",
	"title",
	"base",
	"link",
	"meta",
	"style",
	"script",
	"noscript",
	"template",
]);

// Body <img> fallback skips icons and trackers below this pixel size.
const MIN_BODY_IMAGE_DIMENSION = 50;
// apple-touch-icon defaults to 180x180 when no sizes attribute is present.
const APPLE_TOUCH_ICON_DEFAULT_SIZE = 180;
// Meta refreshes above this delay are page reloads, not redirects.
const MAX_META_REFRESH_DELAY_SECONDS = 10;

interface JsonLdData {
	title: string | null;
	description: string | null;
	image: string | null;
	author: string | null;
	publisher: string | null;
	datePublished: string | null;
	thumbnailUrl: string | null;
}

/** Type-safe string extraction from unknown values */
function str(val: unknown): string | null {
	return typeof val === "string" && val ? val : null;
}

/** Extract a string from an object's property, safely */
function strProp(obj: unknown, key: string): string | null {
	if (!obj || typeof obj !== "object") return null;
	return str((obj as Record<string, unknown>)[key]);
}

function relTokens(rel: string | undefined): Set<string> {
	return new Set((rel || "").toLowerCase().split(/\s+/).filter(Boolean));
}

function iconWidth(sizes: string): number | null {
	for (const candidate of sizes.split(/\s+/)) {
		const separator = candidate.indexOf("x");
		if (
			separator <= 0 ||
			candidate.indexOf("x", separator + 1) !== -1 ||
			!isAsciiDigits(candidate.slice(0, separator)) ||
			!isAsciiDigits(candidate.slice(separator + 1))
		) {
			continue;
		}
		return Number.parseInt(candidate.slice(0, separator), 10);
	}
	return null;
}

function isAsciiDigits(value: string): boolean {
	if (!value) return false;
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code < 48 || code > 57) return false;
	}
	return true;
}

function firstSafeDocumentBase(
	current: string | null,
	href: string | undefined,
	fallback: string,
): string | null {
	return current || resolveHttpUrl(href, fallback);
}

/**
 * Parse HTML string and extract link preview metadata.
 * Uses SAX streaming for maximum speed — stops at </head>.
 */
export function parseHTML(
	html: string,
	baseUrl: string,
	options?: Pick<PreviewOptions, "includeBodyContent">,
): PreviewResult {
	const meta = new Map<string, string>();
	const jsonLdRaw: string[] = [];
	let titleText = "";
	let faviconHref: string | null = null;
	let faviconSize = 0;
	let canonicalHref: string | null = null;
	let imageSrcHref: string | null = null;
	let itempropImage: string | null = null;
	let oEmbedUrl: string | null = null;
	let htmlLang: string | null = null;
	let firstBodyImage: string | null = null;
	let documentBaseUrl: string | null = null;
	let inTitle = false;
	let inJsonLd = false;
	let jsonLdBuf = "";
	let headClosed = false;
	const includeBodyContent = options?.includeBodyContent === true;
	const safeBaseUrl =
		resolveHttpUrl(baseUrl, FALLBACK_BASE_URL) || FALLBACK_BASE_URL;

	let parser: Parser;
	parser = new Parser(
		{
			onopentag(name, attrs) {
				if (name === "body") {
					headClosed = true;
					if (!includeBodyContent) parser.pause();
					return;
				}

				// Implicit body: HTML5 allows omitting <head>/<body>, so the first
				// flow-content element ends the head scope.
				if (!headClosed && !HEAD_TAGS.has(name)) {
					headClosed = true;
					if (!includeBodyContent) {
						parser.pause();
						return;
					}
				}

				// JSON-LD: capture in head AND body (body only when includeBodyContent is enabled)
				if (
					name === "script" &&
					(attrs.type || "").toLowerCase().includes("ld+json")
				) {
					if (!headClosed || includeBodyContent) {
						inJsonLd = true;
						jsonLdBuf = "";
					}
					return;
				}
				// First meaningful <img> in body as image fallback
				if (
					headClosed &&
					name === "img" &&
					!firstBodyImage &&
					attrs.src &&
					includeBodyContent
				) {
					const w = attrs.width ? Number.parseInt(attrs.width, 10) : 0;
					const h = attrs.height ? Number.parseInt(attrs.height, 10) : 0;
					if (
						!(w > 0 && w < MIN_BODY_IMAGE_DIMENSION) &&
						!(h > 0 && h < MIN_BODY_IMAGE_DIMENSION) &&
						!attrs.src.startsWith("data:")
					) {
						firstBodyImage = attrs.src;
					}
					return;
				}
				if (headClosed) return;

				if (name === "base") {
					documentBaseUrl = firstSafeDocumentBase(
						documentBaseUrl,
						attrs.href,
						safeBaseUrl,
					);
				}

				if (name === "html" && attrs.lang && !htmlLang) {
					htmlLang = attrs.lang;
				}

				if (name === "meta") {
					const prop =
						attrs.property || attrs.name || attrs["http-equiv"] || "";
					const content = attrs.content;
					if (content && prop) {
						const key = prop.toLowerCase();
						if (!meta.has(key)) meta.set(key, content);
					}
					// itemprop="image" fallback (Schema.org microdata)
					if (attrs.itemprop === "image" && attrs.content && !itempropImage) {
						itempropImage = attrs.content;
					}
				}

				if (name === "link") {
					const rel = relTokens(attrs.rel);
					const href = attrs.href;

					// Favicon
					if (href && (rel.has("icon") || rel.has("apple-touch-icon"))) {
						const sizes = attrs.sizes || "";
						const declaredWidth = iconWidth(sizes);
						const size =
							declaredWidth !== null
								? declaredWidth
								: rel.has("apple-touch-icon")
									? APPLE_TOUCH_ICON_DEFAULT_SIZE
									: 0;
						if (size >= faviconSize) {
							faviconSize = size;
							faviconHref = href;
						}
					}

					// Canonical URL
					if (href && rel.has("canonical")) {
						canonicalHref = href;
					}

					// Legacy image_src (old Facebook protocol)
					if (href && rel.has("image_src")) {
						imageSrcHref = href;
					}

					// oEmbed discovery
					if (
						href &&
						rel.has("alternate") &&
						(attrs.type || "").toLowerCase().includes("oembed") &&
						!oEmbedUrl
					) {
						oEmbedUrl = href;
					}

					// itemprop="image" on link tags
					if (href && attrs.itemprop === "image" && !itempropImage) {
						itempropImage = href;
					}
				}

				if (name === "title") inTitle = true;
			},

			ontext(text) {
				if (inTitle) titleText += text;
				if (inJsonLd) jsonLdBuf += text;
			},

			onclosetag(name) {
				if (name === "title") inTitle = false;
				if (name === "script" && inJsonLd) {
					inJsonLd = false;
					jsonLdRaw.push(jsonLdBuf);
				}
				if (name === "head") {
					headClosed = true;
					if (!includeBodyContent) parser.pause();
				}
			},
		},
		{
			decodeEntities: true,
			lowerCaseTags: true,
			lowerCaseAttributeNames: true,
		},
	);

	parser.write(html);
	parser.end();

	const jsonLd = extractJsonLd(jsonLdRaw);

	// ── Build result with fallback chain ──
	// htmlparser2 already decoded entities, so values are used as-is.
	const get = (...keys: string[]): string | null => {
		for (const k of keys) {
			const v = meta.get(k);
			if (v) return v;
		}
		return null;
	};

	const parsedUrl = new URL(safeBaseUrl);
	const effectiveBaseUrl = documentBaseUrl || safeBaseUrl;

	const title =
		get("og:title", "twitter:title") ||
		jsonLd.title ||
		get("dc.title", "dcterms.title") ||
		titleText.trim() ||
		null;

	const description =
		get("og:description", "twitter:description", "description") ||
		jsonLd.description ||
		get("dc.description", "dcterms.description");

	const rawImage =
		get(
			"og:image",
			"og:image:url",
			"og:image:secure_url",
			"twitter:image",
			"twitter:image:src",
		) ||
		jsonLd.image ||
		jsonLd.thumbnailUrl ||
		imageSrcHref ||
		itempropImage ||
		firstBodyImage;
	const image = resolveHttpUrl(rawImage, effectiveBaseUrl);

	const imageWidthRaw = get("og:image:width");
	const imageHeightRaw = get("og:image:height");
	const imageWidth = imageWidthRaw ? Number.parseInt(imageWidthRaw, 10) : null;
	const imageHeight = imageHeightRaw
		? Number.parseInt(imageHeightRaw, 10)
		: null;

	const siteName =
		get("og:site_name") ||
		jsonLd.publisher ||
		parsedUrl.hostname.replace(/^www\./, "");

	const favicon =
		resolveHttpUrl(faviconHref, effectiveBaseUrl) ||
		resolveHttpUrl("/favicon.ico", safeBaseUrl);

	const mediaType = get("og:type") || "website";

	const author =
		jsonLd.author ||
		get(
			"author",
			"article:author",
			"dc.creator",
			"dcterms.creator",
			"sailthru.author",
			"parsely-author",
		);

	const canonicalUrl =
		resolveHttpUrl(canonicalHref, effectiveBaseUrl) ||
		resolveHttpUrl(get("og:url"), effectiveBaseUrl) ||
		safeBaseUrl;

	const locale = get("og:locale");

	const publishedDate =
		get("article:published_time") ||
		jsonLd.datePublished ||
		get("dc.date", "dcterms.date");

	const video = resolveHttpUrl(
		get("og:video", "og:video:url", "og:video:secure_url"),
		effectiveBaseUrl,
	);
	const audio = resolveHttpUrl(
		get("og:audio", "og:audio:url", "og:audio:secure_url"),
		effectiveBaseUrl,
	);
	const lang =
		htmlLang ||
		get("content-language") ||
		(locale ? locale.split("_")[0] : null);

	const twitterCard = get("twitter:card");
	const twitterSite = get("twitter:site");
	const twitterCreator = get("twitter:creator");
	const imageAlt = get("og:image:alt", "twitter:image:alt");
	const themeColor = get("theme-color");

	const keywordsRaw = get("keywords");
	const keywords = keywordsRaw
		? keywordsRaw
				.split(",")
				.map((k) => k.trim())
				.filter(Boolean)
		: null;

	const result: PreviewResult = {
		url: canonicalUrl,
		statusCode: 0,
		title,
		description,
		image,
		imageAlt,
		imageWidth: Number.isNaN(imageWidth) ? null : imageWidth,
		imageHeight: Number.isNaN(imageHeight) ? null : imageHeight,
		siteName,
		favicon,
		mediaType,
		canonicalUrl,
		author,
		locale,
		lang,
		publishedDate,
		keywords,
		video,
		audio,
		twitterCard,
		twitterSite,
		twitterCreator,
		themeColor,
		oEmbedUrl: resolveHttpUrl(oEmbedUrl, effectiveBaseUrl),
	};

	return result;
}

/** Flatten a JSON-LD payload into the items worth inspecting. */
function jsonLdItems(data: unknown): unknown[] {
	if (Array.isArray(data)) return data;
	if (!data || typeof data !== "object") return [data];
	const graph = (data as Record<string, unknown>)["@graph"];
	if (Array.isArray(graph)) return [data, ...graph];
	if (graph && typeof graph === "object") return [data, graph];
	return [data];
}

function extractJsonLd(jsonLdRaw: string[]): JsonLdData {
	const jsonLd: JsonLdData = {
		title: null,
		description: null,
		image: null,
		author: null,
		publisher: null,
		datePublished: null,
		thumbnailUrl: null,
	};

	for (const raw of jsonLdRaw) {
		let data: unknown;
		try {
			data = JSON.parse(raw);
		} catch {
			// Invalid JSON-LD, skip
			continue;
		}
		for (const item of jsonLdItems(data)) {
			if (!item || typeof item !== "object") continue;
			const obj = item as Record<string, unknown>;
			if (!jsonLd.title) jsonLd.title = str(obj.name) || str(obj.headline);
			if (!jsonLd.description) jsonLd.description = str(obj.description);
			if (!jsonLd.image) {
				const img = obj.image;
				if (typeof img === "string") jsonLd.image = img;
				else if (Array.isArray(img) && img[0])
					jsonLd.image =
						typeof img[0] === "string"
							? img[0]
							: strProp(img[0], "url") || strProp(img[0], "contentUrl");
				else if (img && typeof img === "object")
					jsonLd.image = strProp(img, "url") || strProp(img, "contentUrl");
			}
			if (!jsonLd.thumbnailUrl) jsonLd.thumbnailUrl = str(obj.thumbnailUrl);
			if (!jsonLd.author) {
				const author = obj.author || obj.creator;
				if (typeof author === "string") jsonLd.author = author;
				else if (Array.isArray(author) && author[0])
					jsonLd.author =
						typeof author[0] === "string"
							? author[0]
							: strProp(author[0], "name");
				else jsonLd.author = strProp(author, "name");
			}
			if (!jsonLd.publisher) {
				const pub = obj.publisher;
				if (typeof pub === "string") jsonLd.publisher = pub;
				else jsonLd.publisher = strProp(pub, "name");
			}
			if (!jsonLd.datePublished)
				jsonLd.datePublished = str(obj.datePublished) || str(obj.dateCreated);
		}
	}

	return jsonLd;
}

/**
 * Extract meta-refresh redirect URLs without depending on attribute order.
 * Refreshes slower than {@link MAX_META_REFRESH_DELAY_SECONDS} are treated as
 * page reloads rather than redirects and return null.
 */
export function extractMetaRefreshUrl(
	html: string,
	baseUrl: string,
): string | null {
	let refreshUrl: string | null = null;
	const safeBaseUrl =
		resolveHttpUrl(baseUrl, FALLBACK_BASE_URL) || FALLBACK_BASE_URL;
	let documentBaseUrl: string | null = null;
	const parser = new Parser(
		{
			onopentag(name, attrs) {
				if (refreshUrl) return;
				if (name === "base") {
					documentBaseUrl = firstSafeDocumentBase(
						documentBaseUrl,
						attrs.href,
						safeBaseUrl,
					);
					return;
				}
				if (name !== "meta") return;
				if ((attrs["http-equiv"] || "").toLowerCase() !== "refresh") return;
				refreshUrl = parseMetaRefreshContent(
					attrs.content,
					documentBaseUrl || safeBaseUrl,
				);
			},
		},
		{
			decodeEntities: true,
			lowerCaseTags: true,
			lowerCaseAttributeNames: true,
		},
	);

	parser.write(html);
	parser.end();

	return refreshUrl;
}

function parseMetaRefreshContent(
	content: string | undefined,
	baseUrl: string,
): string | null {
	if (!content) return null;
	const match = content.match(
		/^\s*(\d+(?:\.\d+)?)\s*[;,]\s*url\s*=\s*(?:"([^"]+)"|'([^']+)'|([^'">\s]+))/i,
	);
	if (!match) return null;
	if (Number.parseFloat(match[1]) > MAX_META_REFRESH_DELAY_SECONDS) return null;
	const target = match[2] ?? match[3] ?? match[4];
	return resolveHttpUrl(target?.trim(), baseUrl);
}
