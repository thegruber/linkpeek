import { Parser } from "htmlparser2";
import { LinkpeekError } from "./errors.js";
import { resolveHttpUrl } from "./resolve.js";
import type { PreviewOptions, PreviewResult } from "./types.js";

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
]);

// Containers whose content is skipped while the head is open. <noscript> holds
// tracking pixels (Meta Pixel) and inline <svg>/<math> hold sprites; neither
// ends the head in practice, and browsers with scripting enabled never read
// <noscript> metadata. <template> content is inert everywhere.
const HEAD_INERT_TAGS = new Set(["noscript", "svg", "math"]);

const MEDIA_URL_KEYS = new Set([
	"og:video",
	"og:video:url",
	"og:video:secure_url",
	"og:audio",
	"og:audio:url",
	"og:audio:secure_url",
]);

// Body <img> fallback skips icons and trackers below this pixel size.
const MIN_BODY_IMAGE_DIMENSION = 50;
// apple-touch-icon defaults to 180x180 when no sizes attribute is present.
const APPLE_TOUCH_ICON_DEFAULT_SIZE = 180;
// A scalable icon (sizes="any" or SVG) outranks small raster favicons but not
// a large raster touch icon, which renders everywhere.
const SCALABLE_ICON_RANK = 64;
// Meta refreshes above this delay are page reloads, not redirects.
const MAX_META_REFRESH_DELAY_SECONDS = 10;

/**
 * Tracks whether a SAX stream is still inside the document head, skipping
 * inert containers. Shared by every head-scoped parser so they agree on where
 * the head ends.
 */
class HeadScope {
	/** True once </head>, <body> or flow content has been seen. */
	headClosed = false;
	private inertTag: string | null = null;
	private nesting = 0;

	/** Returns true when the tag must be ignored. */
	open(name: string): boolean {
		if (this.inertTag !== null) {
			// An unclosed head <noscript> must not swallow the whole document.
			if (name === "body" && this.inertTag !== "template") {
				this.inertTag = null;
				this.headClosed = true;
				return false;
			}
			if (name === this.inertTag) this.nesting++;
			return true;
		}
		if (
			name === "template" ||
			(!this.headClosed && HEAD_INERT_TAGS.has(name))
		) {
			this.inertTag = name;
			this.nesting = 1;
			return true;
		}
		if (!this.headClosed && !HEAD_TAGS.has(name)) this.headClosed = true;
		return false;
	}

	/** Returns true when the tag must be ignored. */
	close(name: string): boolean {
		if (this.inertTag !== null) {
			if (name === this.inertTag && --this.nesting === 0) this.inertTag = null;
			return true;
		}
		if (name === "head") this.headClosed = true;
		return false;
	}
}

interface HeadBoundaryDetector {
	readonly headClosed: boolean;
	write(chunk: string): void;
}

/**
 * Incrementally detects the HTML head boundary without building metadata.
 * fetchUrl uses this to cancel fast-mode response streams before maxBytes.
 */
export function createHeadBoundaryDetector(): HeadBoundaryDetector {
	const scope = new HeadScope();
	let parser: Parser;

	parser = new Parser(
		{
			onopentag(name) {
				scope.open(name);
				if (scope.headClosed) parser.pause();
			},
			onclosetag(name) {
				scope.close(name);
				if (scope.headClosed) parser.pause();
			},
		},
		{
			decodeEntities: false,
			lowerCaseTags: true,
			lowerCaseAttributeNames: true,
		},
	);

	return {
		get headClosed() {
			return scope.headClosed;
		},
		write(chunk) {
			if (!scope.headClosed) parser.write(chunk);
		},
	};
}

/**
 * Validate the base URL every relative URL resolves against. An invalid base
 * would otherwise invent a site name, favicon and canonical URL.
 */
function requireBaseUrl(baseUrl: string): string {
	let parsed: URL | null = null;
	try {
		parsed = new URL(baseUrl);
	} catch {
		/* reported below */
	}
	if (
		!parsed ||
		(parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
		parsed.username ||
		parsed.password
	) {
		throw new LinkpeekError(
			"INVALID_URL",
			"baseUrl must be an absolute http or https URL without credentials",
		);
	}
	return parsed.href;
}

const UNCLEAN_WHITESPACE = /^\s|\s$|\s\s|[^\S ]/;

/** Collapse runs of whitespace and trim; empty strings become null. */
function cleanText(value: string | null | undefined): string | null {
	if (!value) return null;
	// Most values are already clean; skip the replace when they are.
	if (!UNCLEAN_WHITESPACE.test(value)) return value;
	return value.replace(/\s+/g, " ").trim() || null;
}

function hasText(value: string | undefined): value is string {
	if (!value) return false;
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code > 32 && code !== 160) return true;
	}
	return false;
}

function hasRel(rel: string, token: string): boolean {
	if (rel === token) return true;
	const index = rel.indexOf(token);
	if (index === -1) return false;
	return rel.split(/\s+/).includes(token);
}

function iconRank(
	sizes: string | undefined,
	type: string | undefined,
	href: string,
	appleTouch: boolean,
): number {
	if (sizes) {
		for (const candidate of sizes.toLowerCase().split(/\s+/)) {
			if (candidate === "any") return SCALABLE_ICON_RANK;
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
	}
	if (appleTouch) return APPLE_TOUCH_ICON_DEFAULT_SIZE;
	if (type?.toLowerCase().includes("svg") || /\.svg(?:[?#]|$)/i.test(href))
		return SCALABLE_ICON_RANK;
	return 0;
}

function isAsciiDigits(value: string): boolean {
	if (!value) return false;
	for (let index = 0; index < value.length; index++) {
		const code = value.charCodeAt(index);
		if (code < 48 || code > 57) return false;
	}
	return true;
}

function imageDimension(value: string | null | undefined): number | null {
	if (!value || !isAsciiDigits(value)) return null;
	const dimension = Number(value);
	return Number.isSafeInteger(dimension) ? dimension : null;
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
 *
 * @throws {LinkpeekError} `INVALID_URL` when `baseUrl` is not an absolute
 * http(s) URL.
 */
export function parseHTML(
	html: string,
	baseUrl: string,
	options?: Pick<PreviewOptions, "includeBodyContent">,
): PreviewResult {
	const safeBaseUrl = requireBaseUrl(baseUrl);
	const meta = new Map<string, string>();
	const ogImages: Map<string, string>[] = [];
	const mediaUrls = new Map<string, string[]>();
	const jsonLdRaw: string[] = [];
	let titleText = "";
	let titleSeen = false;
	let faviconHref: string | null = null;
	let faviconSize = -1;
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
	const includeBodyContent = options?.includeBodyContent === true;
	const scope = new HeadScope();

	let parser: Parser;
	parser = new Parser(
		{
			onopentag(name, attrs) {
				if (scope.open(name)) return;
				const headClosed = scope.headClosed;
				if (headClosed && !includeBodyContent) {
					parser.pause();
					return;
				}

				// JSON-LD: capture in head AND body (body only when includeBodyContent is enabled)
				if (name === "script") {
					if (attrs.type?.toLowerCase().includes("ld+json")) {
						inJsonLd = true;
						jsonLdBuf = "";
					}
					return;
				}
				if (headClosed) {
					// First meaningful <img> in body as image fallback
					if (name === "img" && !firstBodyImage && attrs.src) {
						const w = attrs.width ? Number.parseInt(attrs.width, 10) : 0;
						const h = attrs.height ? Number.parseInt(attrs.height, 10) : 0;
						if (
							!(w > 0 && w < MIN_BODY_IMAGE_DIMENSION) &&
							!(h > 0 && h < MIN_BODY_IMAGE_DIMENSION) &&
							!attrs.src.startsWith("data:")
						) {
							firstBodyImage = resolveHttpUrl(
								attrs.src,
								documentBaseUrl || safeBaseUrl,
							);
						}
					}
					return;
				}

				if (name === "meta") {
					const content = attrs.content;
					if (!hasText(content)) return;
					const prop =
						attrs.property || attrs.name || attrs["http-equiv"] || "";
					if (prop) {
						const key = prop.toLowerCase();
						if (key.startsWith("og:")) {
							if (key === "og:image" || key === "og:image:url") {
								ogImages.push(new Map([["url", content]]));
							} else if (key.startsWith("og:image:")) {
								const image = ogImages.at(-1);
								const field = key.slice("og:image:".length);
								if (image && !image.has(field)) image.set(field, content);
							} else if (MEDIA_URL_KEYS.has(key)) {
								const values = mediaUrls.get(key);
								if (values) values.push(content);
								else mediaUrls.set(key, [content]);
							}
						}
						if (!meta.has(key)) meta.set(key, content);
					}
					// itemprop="image" fallback (Schema.org microdata)
					if (attrs.itemprop === "image" && !itempropImage) {
						itempropImage = content;
					}
					return;
				}

				if (name === "link") {
					const href = attrs.href;
					if (!href) return;
					const rel = (attrs.rel || "").toLowerCase();

					// Favicon
					const appleTouch =
						hasRel(rel, "apple-touch-icon") ||
						hasRel(rel, "apple-touch-icon-precomposed");
					if (appleTouch || hasRel(rel, "icon")) {
						const size = iconRank(attrs.sizes, attrs.type, href, appleTouch);
						if (size > faviconSize) {
							faviconSize = size;
							faviconHref = href;
						}
					}

					// Canonical URL and legacy image_src: first wins, like every other field
					if (!canonicalHref && hasRel(rel, "canonical")) canonicalHref = href;
					if (!imageSrcHref && hasRel(rel, "image_src")) imageSrcHref = href;

					// oEmbed discovery
					if (
						!oEmbedUrl &&
						hasRel(rel, "alternate") &&
						(attrs.type || "").toLowerCase().includes("oembed")
					) {
						oEmbedUrl = href;
					}

					// itemprop="image" on link tags
					if (attrs.itemprop === "image" && !itempropImage) {
						itempropImage = href;
					}
					return;
				}

				if (name === "title") {
					if (!titleSeen) inTitle = true;
				} else if (name === "base") {
					documentBaseUrl = firstSafeDocumentBase(
						documentBaseUrl,
						attrs.href,
						safeBaseUrl,
					);
				} else if (name === "html" && attrs.lang && !htmlLang) {
					htmlLang = attrs.lang;
				}
			},

			ontext(text) {
				if (inTitle) titleText += text;
				else if (inJsonLd) jsonLdBuf += text;
			},

			onclosetag(name) {
				if (scope.close(name)) return;
				if (name === "title" && inTitle) {
					inTitle = false;
					titleSeen = true;
				} else if (name === "script" && inJsonLd) {
					inJsonLd = false;
					jsonLdRaw.push(jsonLdBuf);
				} else if (scope.headClosed && !includeBodyContent) {
					parser.pause();
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
	const getText = (...keys: string[]): string | null => cleanText(get(...keys));

	const effectiveBaseUrl = documentBaseUrl || safeBaseUrl;

	const title =
		getText("og:title", "twitter:title", "dc.title", "dcterms.title") ||
		cleanText(titleText) ||
		jsonLd.title;

	const description =
		getText("og:description", "twitter:description", "description") ||
		jsonLd.description ||
		getText("dc.description", "dcterms.description");

	const firstSafeUrl = (
		values: (string | null | undefined)[],
	): string | null => {
		for (const value of values) {
			const resolved = resolveHttpUrl(value, effectiveBaseUrl);
			if (resolved) return resolved;
		}
		return null;
	};
	const selectedImage = ogImages.find((candidate) =>
		firstSafeUrl([candidate.get("url"), candidate.get("secure_url")]),
	);
	const ogImage = firstSafeUrl([
		selectedImage?.get("url"),
		selectedImage?.get("secure_url"),
		ogImages.length ? null : get("og:image:secure_url"),
	]);
	const twitterImage = firstSafeUrl([
		get("twitter:image"),
		get("twitter:image:src"),
	]);
	const image =
		ogImage ||
		twitterImage ||
		firstSafeUrl([
			jsonLd.image,
			jsonLd.thumbnailUrl,
			imageSrcHref,
			itempropImage,
			firstBodyImage,
		]);

	const imageWidth = imageDimension(selectedImage?.get("width"));
	const imageHeight = imageDimension(selectedImage?.get("height"));

	const siteName =
		getText("og:site_name") ||
		jsonLd.publisher ||
		jsonLd.siteName ||
		new URL(safeBaseUrl).hostname.replace(/^www\./, "");

	const favicon =
		resolveHttpUrl(faviconHref, effectiveBaseUrl) ||
		resolveHttpUrl("/favicon.ico", safeBaseUrl);

	const mediaType = getText("og:type") || "website";

	const author =
		jsonLd.author ||
		getText(
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

	const locale = getText("og:locale");

	const publishedDate =
		getText("article:published_time") ||
		jsonLd.datePublished ||
		getText("dc.date", "dcterms.date");

	const video = firstSafeUrl(
		["og:video", "og:video:url", "og:video:secure_url"].flatMap(
			(key) => mediaUrls.get(key) || [],
		),
	);
	const audio = firstSafeUrl(
		["og:audio", "og:audio:url", "og:audio:secure_url"].flatMap(
			(key) => mediaUrls.get(key) || [],
		),
	);

	const lang =
		cleanText(htmlLang) ||
		getText("content-language") ||
		(locale ? locale.split("_")[0] : null);

	let imageAlt: string | null = null;
	if (ogImage) {
		imageAlt = selectedImage
			? cleanText(selectedImage.get("alt"))
			: getText("og:image:alt");
	} else if (twitterImage) {
		imageAlt = getText("twitter:image:alt");
	} else if (!image) {
		// Preserve standalone alt metadata when no image can be selected.
		imageAlt = getText("og:image:alt", "twitter:image:alt");
	}

	const keywordsRaw = get("keywords");
	const keywords = keywordsRaw
		? keywordsRaw
				.split(",")
				.map((k) => cleanText(k))
				.filter((k): k is string => k !== null)
		: null;

	return {
		url: canonicalUrl,
		statusCode: 0,
		title,
		description,
		image,
		imageAlt,
		imageWidth,
		imageHeight,
		siteName,
		favicon,
		mediaType,
		canonicalUrl,
		author,
		locale,
		lang,
		publishedDate,
		keywords: keywords?.length ? keywords : null,
		video,
		audio,
		twitterCard: getText("twitter:card"),
		twitterSite: getText("twitter:site"),
		twitterCreator: getText("twitter:creator"),
		themeColor: getText("theme-color"),
		oEmbedUrl: resolveHttpUrl(oEmbedUrl, effectiveBaseUrl),
		truncated: false,
	};
}

// ── JSON-LD ──

interface JsonLdData {
	title: string | null;
	description: string | null;
	image: string | null;
	author: string | null;
	publisher: string | null;
	siteName: string | null;
	datePublished: string | null;
	thumbnailUrl: string | null;
}

type JsonObject = Record<string, unknown>;

// Entities that describe the site, its owner or page furniture rather than
// the page content. They never supply the title or description.
const SITE_ENTITY_TYPES = new Set([
	"organization",
	"corporation",
	"localbusiness",
	"newsmediaorganization",
	"educationalorganization",
	"governmentorganization",
	"ngo",
	"brand",
	"website",
	"person",
	"breadcrumblist",
	"listitem",
	"imageobject",
	"sitenavigationelement",
	"wpheader",
	"wpfooter",
	"wpsidebar",
	"searchaction",
	"entrypoint",
	"readaction",
	"contactpoint",
	"postaladdress",
]);

// Page wrappers rank below the content entity they describe.
const PAGE_ENTITY_TYPES = new Set([
	"webpage",
	"aboutpage",
	"checkoutpage",
	"collectionpage",
	"contactpage",
	"faqpage",
	"itempage",
	"medicalwebpage",
	"profilepage",
	"qapage",
	"realestatelisting",
	"searchresultspage",
]);

/** Lowercased schema.org type name without a vocabulary prefix. */
function typeName(type: unknown): string {
	if (typeof type !== "string") return "";
	const cut = Math.max(type.lastIndexOf("/"), type.lastIndexOf(":"));
	return type.slice(cut + 1).toLowerCase();
}

/** 0: site/furniture, 1: page wrapper, 2: untyped node, 3: typed content entity. */
function entityRank(item: JsonObject): number {
	const raw = item["@type"];
	// Untyped nodes (often a @graph wrapper) lose to typed content entities.
	if (raw == null) return 2;
	let rank = 0;
	for (const type of Array.isArray(raw) ? raw : [raw]) {
		const name = typeName(type);
		if (PAGE_ENTITY_TYPES.has(name)) rank = Math.max(rank, 1);
		else if (!SITE_ENTITY_TYPES.has(name)) return 3;
	}
	return rank;
}

function isWebSite(item: JsonObject): boolean {
	const raw = item["@type"];
	return Array.isArray(raw)
		? raw.some((type) => typeName(type) === "website")
		: typeName(raw) === "website";
}

const CONTENT_FIELDS = [
	"headline",
	"name",
	"description",
	"image",
	"thumbnailUrl",
	"author",
	"creator",
	"datePublished",
];

function hasContentField(item: JsonObject): boolean {
	for (const field of CONTENT_FIELDS) if (item[field] != null) return true;
	return false;
}

/** Collect objects from arrays and @graph containers in document order. */
function collectJsonLdItems(data: unknown, items: JsonObject[]): void {
	if (Array.isArray(data)) {
		for (const entry of data) collectJsonLdItems(entry, items);
	} else if (data && typeof data === "object") {
		items.push(data as JsonObject);
		const graph = (data as JsonObject)["@graph"];
		if (graph && typeof graph === "object") collectJsonLdItems(graph, items);
	}
}

function jsonText(value: unknown): string | null {
	return typeof value === "string" ? cleanText(value) : null;
}

/** First entry of a value, following {"@id": "..."} references. */
function jsonNode(value: unknown, byId: Map<string, JsonObject>): unknown {
	const node = Array.isArray(value) ? value[0] : value;
	if (node && typeof node === "object") {
		const id = (node as JsonObject)["@id"];
		if (typeof id === "string") return byId.get(id) ?? node;
	}
	return node;
}

function jsonName(
	value: unknown,
	byId: Map<string, JsonObject>,
): string | null {
	const node = jsonNode(value, byId);
	return typeof node === "string"
		? cleanText(node)
		: jsonText((node as JsonObject | null)?.name);
}

function jsonUrl(value: unknown, byId: Map<string, JsonObject>): string | null {
	const node = jsonNode(value, byId);
	if (typeof node === "string") return node.trim() || null;
	if (!node || typeof node !== "object") return null;
	return (
		jsonText((node as JsonObject).url) ||
		jsonText((node as JsonObject).contentUrl)
	);
}

function extractJsonLd(jsonLdRaw: string[]): JsonLdData {
	const jsonLd: JsonLdData = {
		title: null,
		description: null,
		image: null,
		author: null,
		publisher: null,
		siteName: null,
		datePublished: null,
		thumbnailUrl: null,
	};
	if (!jsonLdRaw.length) return jsonLd;

	const items: JsonObject[] = [];
	for (const raw of jsonLdRaw) {
		try {
			collectJsonLdItems(JSON.parse(raw), items);
		} catch {
			// Invalid or pathologically nested JSON-LD, skip
		}
	}

	// Take content fields from one entity so a site-wide Organization or an
	// unrelated Product cannot mix its name into an article preview.
	const byId = new Map<string, JsonObject>();
	let primary: JsonObject | null = null;
	let primaryRank = 0;
	// Yoast-style graphs put the description on the WebPage, not the Article.
	let pageDescription: string | null = null;
	for (const item of items) {
		const id = item["@id"];
		if (typeof id === "string" && !byId.has(id)) byId.set(id, item);
		if (!jsonLd.siteName && isWebSite(item))
			jsonLd.siteName = jsonText(item.name);
		if (!pageDescription && entityRank(item) === 1)
			pageDescription = jsonText(item.description) || null;
		if (primaryRank < 3) {
			const rank = entityRank(item);
			if (rank > primaryRank && hasContentField(item)) {
				primary = item;
				primaryRank = rank;
			}
		}
	}
	if (!primary) return jsonLd;

	jsonLd.title = jsonText(primary.headline) || jsonText(primary.name);
	jsonLd.description = jsonText(primary.description) || pageDescription;
	jsonLd.image = jsonUrl(primary.image, byId);
	jsonLd.thumbnailUrl = jsonUrl(primary.thumbnailUrl, byId);
	jsonLd.author =
		jsonName(primary.author, byId) || jsonName(primary.creator, byId);
	jsonLd.publisher = jsonName(primary.publisher, byId);
	jsonLd.datePublished =
		jsonText(primary.datePublished) ||
		jsonText(primary.dateCreated) ||
		jsonText(primary.uploadDate);
	return jsonLd;
}

// ── Meta refresh ──

/**
 * Extract head-scoped meta-refresh redirect URLs without depending on
 * attribute order. Body refresh tags are invalid HTML and intentionally ignored.
 * Refreshes slower than {@link MAX_META_REFRESH_DELAY_SECONDS} are treated as
 * page reloads rather than redirects and return null.
 */
export function extractMetaRefreshUrl(
	html: string,
	baseUrl: string,
): string | null {
	const safeBaseUrl = requireBaseUrl(baseUrl);
	let refreshUrl: string | null = null;
	let documentBaseUrl: string | null = null;
	const scope = new HeadScope();
	let parser: Parser;
	parser = new Parser(
		{
			onopentag(name, attrs) {
				if (scope.open(name)) return;
				if (scope.headClosed) {
					parser.pause();
					return;
				}
				if (name === "base") {
					documentBaseUrl = firstSafeDocumentBase(
						documentBaseUrl,
						attrs.href,
						safeBaseUrl,
					);
					return;
				}
				if (name !== "meta" || refreshUrl) return;
				if ((attrs["http-equiv"] || "").toLowerCase() !== "refresh") return;
				refreshUrl = parseMetaRefreshContent(
					attrs.content,
					documentBaseUrl || safeBaseUrl,
				);
			},
			onclosetag(name) {
				scope.close(name);
				if (scope.headClosed) parser.pause();
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

// "<delay>[;|,| ]<url>", with an optional "url=" prefix and optional quotes.
const META_REFRESH_PATTERN =
	/^\s*(\d+(?:\.\d*)?)\s*(?:[;,]|\s)\s*(?:url\s*=\s*)?(?:"([^"]*)"|'([^']*)'|(\S+))/i;

function parseMetaRefreshContent(
	content: string | undefined,
	baseUrl: string,
): string | null {
	if (!content) return null;
	const match = content.match(META_REFRESH_PATTERN);
	if (!match) return null;
	if (Number.parseFloat(match[1]) > MAX_META_REFRESH_DELAY_SECONDS) return null;
	const target = (match[2] ?? match[3] ?? match[4])?.trim();
	// "0; url=" with nothing after it must not resolve "url=" as a path.
	if (!target || /^url\s*=/i.test(target)) return null;
	return resolveHttpUrl(target, baseUrl);
}
