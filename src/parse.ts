import { Parser } from "htmlparser2";
import { decodeEntities, resolveUrl } from "./resolve.js";
import type { PreviewOptions, PreviewResult } from "./types.js";

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

/**
 * Parse HTML string and extract link preview metadata.
 * Uses SAX streaming for maximum speed — stops at </head>.
 */
export function parseHTML(
	html: string,
	baseUrl: string,
	options?: Pick<PreviewOptions, "includeBodyContent">,
): PreviewResult {
	const meta: Record<string, string> = {};
	const jsonLdRaw: string[] = [];
	let titleText = "";
	let faviconHref: string | null = null;
	let faviconSize = 0;
	let canonicalHref: string | null = null;
	let imageSrcHref: string | null = null;
	let itempropImage: string | null = null;
	let oEmbedUrl: string | null = null;
	let metaRefreshUrl: string | null = null;
	let firstBodyImage: string | null = null;
	let inTitle = false;
	let inJsonLd = false;
	let jsonLdBuf = "";
	let headClosed = false;

	const parser = new Parser(
		{
			onopentag(name, attrs) {
				// JSON-LD: capture in head AND body (body only when includeBodyContent is enabled)
				if (name === "script" && (attrs.type || "").includes("ld+json")) {
					if (!headClosed || options?.includeBodyContent === true) {
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
					options?.includeBodyContent === true
				) {
					const w = attrs.width ? Number.parseInt(attrs.width, 10) : 0;
					const h = attrs.height ? Number.parseInt(attrs.height, 10) : 0;
					if (
						!(w > 0 && w < 50) &&
						!(h > 0 && h < 50) &&
						!attrs.src.startsWith("data:")
					) {
						firstBodyImage = attrs.src;
					}
					return;
				}
				if (headClosed) return;

				if (name === "meta") {
					const prop =
						attrs.property || attrs.name || attrs["http-equiv"] || "";
					const content = attrs.content;
					if (content && prop) {
						const key = prop.toLowerCase();
						meta[key] = content;
						// Detect meta-refresh during SAX pass (avoids re-scanning)
						if (key === "refresh" && !metaRefreshUrl) {
							const m = content.match(
								/^\s*\d+\s*;\s*url\s*=\s*['"]?([^'">\s]+)/i,
							);
							if (m?.[1]) metaRefreshUrl = m[1];
						}
					}
					// itemprop="image" fallback (Schema.org microdata)
					if (attrs.itemprop === "image" && attrs.content && !itempropImage) {
						itempropImage = attrs.content;
					}
				}

				if (name === "link") {
					const rel = (attrs.rel || "").toLowerCase();
					const href = attrs.href;

					// Favicon
					if (
						href &&
						(rel === "icon" ||
							rel === "shortcut icon" ||
							rel === "apple-touch-icon")
					) {
						const sizes = attrs.sizes || "";
						const sizeMatch = sizes.match(/(\d+)x(\d+)/);
						const size = sizeMatch
							? Number.parseInt(sizeMatch[1], 10)
							: rel === "apple-touch-icon"
								? 180
								: 0;
						if (size >= faviconSize) {
							faviconSize = size;
							faviconHref = href;
						}
					}

					// Canonical URL
					if (href && rel === "canonical") {
						canonicalHref = href;
					}

					// Legacy image_src (old Facebook protocol)
					if (href && rel === "image_src") {
						imageSrcHref = href;
					}

					// oEmbed discovery
					if (
						href &&
						rel === "alternate" &&
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
				if (name === "head") headClosed = true;
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

	// ── Parse JSON-LD ──
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
		try {
			const data = JSON.parse(raw);
			const items: unknown[] = Array.isArray(data)
				? data
				: (data?.["@graph"] as unknown[]) || [data];
			for (const item of items) {
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
		} catch {
			// Invalid JSON-LD, skip
		}
	}

	// ── Build result with fallback chain ──
	const get = (...keys: string[]): string | null => {
		for (const k of keys) {
			const v = meta[k];
			if (v) return decodeEntities(v);
		}
		return null;
	};

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(baseUrl);
	} catch {
		parsedUrl = new URL("https://example.com");
	}

	const title =
		get("og:title", "twitter:title") ||
		jsonLd.title ||
		get("dc.title", "dcterms.title") ||
		decodeEntities(titleText.trim()) ||
		null;

	const description =
		get("og:description", "twitter:description", "description") ||
		jsonLd.description ||
		get("dc.description", "dcterms.description") ||
		null;

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
		(imageSrcHref ? decodeEntities(imageSrcHref) : null) ||
		(itempropImage ? decodeEntities(itempropImage) : null) ||
		(firstBodyImage ? decodeEntities(firstBodyImage) : null) ||
		null;
	const image = resolveUrl(rawImage, baseUrl);

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
		resolveUrl(faviconHref, baseUrl) || resolveUrl("/favicon.ico", baseUrl);

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
		) ||
		null;

	const canonicalUrl =
		resolveUrl(canonicalHref, baseUrl) || get("og:url") || baseUrl;

	const locale = get("og:locale") || null;

	const publishedDate =
		get("article:published_time") ||
		jsonLd.datePublished ||
		get("dc.date", "dcterms.date") ||
		null;

	const video = get("og:video", "og:video:url", "og:video:secure_url") || null;

	const twitterCard = get("twitter:card") || null;
	const twitterSite = get("twitter:site") || null;
	const themeColor = get("theme-color") || null;

	const keywordsRaw = get("keywords");
	const keywords = keywordsRaw
		? keywordsRaw
				.split(",")
				.map((k) => k.trim())
				.filter(Boolean)
		: null;

	const result: PreviewResult = {
		url: canonicalUrl,
		title,
		description,
		image,
		imageWidth: Number.isNaN(imageWidth) ? null : imageWidth,
		imageHeight: Number.isNaN(imageHeight) ? null : imageHeight,
		siteName,
		favicon,
		mediaType,
		author,
		canonicalUrl,
		locale,
		publishedDate,
		video,
		twitterCard,
		twitterSite,
		themeColor,
		keywords,
		oEmbedUrl: resolveUrl(oEmbedUrl, baseUrl),
	};

	return result;
}

/**
 * Extract meta-refresh redirect URL detected during SAX parsing.
 * Exported separately so index.ts can use SAX-detected value first,
 * falling back to regex only if needed.
 */
export function extractMetaRefreshUrl(
	html: string,
	baseUrl: string,
): string | null {
	const match = html.match(
		/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]+content\s*=\s*["']?\d+\s*;\s*url\s*=\s*['"]?([^'">\s]+)/i,
	);
	if (!match?.[1]) return null;
	return resolveUrl(match[1], baseUrl);
}
