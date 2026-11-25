/** Options for `preview()` and `parseHTML()`. */
export interface PreviewOptions {
	/**
	 * Timeout in milliseconds for the whole `preview()` call, from 0 to
	 * 2_147_483_647, covering redirects, the body read and any meta-refresh hop
	 * (default: 8000)
	 */
	timeout?: number;
	/** Maximum decoded response-body bytes to retain (default: 30_000) */
	maxBytes?: number;
	/** User-Agent header (default: "Twitterbot/1.0") */
	userAgent?: string;
	/** Follow HTTP redirects (default: true) */
	followRedirects?: boolean;
	/**
	 * Maximum redirects per call, HTTP and meta refresh combined; must be a
	 * non-negative integer (default: 10)
	 */
	maxRedirects?: number;
	/** Extra non-sensitive request headers. Common credential-bearing headers are rejected. */
	headers?: Record<string, string>;
	/** Allow fetching private/internal IPs (default: false) */
	allowPrivateIPs?: boolean;
	/**
	 * Opt-in DNS check (default: none, so no DNS check runs). Called with the
	 * hostname of the first request and of every redirect hop (IP literals are
	 * skipped); the request is blocked with `PRIVATE_NETWORK_BLOCKED` if any
	 * returned address is private. If the lookup throws or returns no
	 * addresses, `preview()` rejects with a `LinkpeekError` whose code is
	 * `FETCH_FAILED`; a thrown resolver error is kept as its `cause`. Platform
	 * fetch still resolves the name again, so this narrows DNS rebinding rather
	 * than pinning the address. Ignored when `allowPrivateIPs` is true.
	 *
	 * @example Node.js
	 * import { lookup } from "node:dns/promises";
	 * resolveHost: async (host) =>
	 *   (await lookup(host, { all: true })).map((a) => a.address)
	 */
	resolveHost?: (hostname: string) => Promise<string[]>;
	/**
	 * Abort the request from the caller side. Combined with the timeout —
	 * whichever fires first wins. A caller abort is rethrown as-is; a timeout
	 * throws a LinkpeekError with code "TIMEOUT".
	 */
	signal?: AbortSignal;
	/**
	 * Custom fetch implementation, e.g. a proxy-aware or caching wrapper.
	 * It must honor RequestInit.redirect ("manual") and the supplied abort signal
	 * so redirects stay inside linkpeek's validation loop. If it follows
	 * redirects anyway, the final `response.url` is still validated.
	 * (default: globalThis.fetch)
	 */
	fetch?: typeof globalThis.fetch;
	/**
	 * Follow <head> <meta http-equiv="refresh"> redirects with a delay of 10 seconds
	 * or less (longer delays are page reloads, not redirects). Disabling this
	 * skips the extra HTTP round-trip at the cost of missing
	 * Cloudflare-challenged or JS-redirect pages. (default: false)
	 */
	followMetaRefresh?: boolean;
	/**
	 * Continue parsing <body> for JSON-LD scripts and image fallbacks after </head>.
	 * Disabling this stops strictly at </head>, allowing much lower maxBytes (e.g. 30_000)
	 * for maximum speed. (default: false)
	 */
	includeBodyContent?: boolean;
}

/** Metadata extracted from a fetched URL or parsed HTML document. */
export interface PreviewResult {
	/** Final fetched URL after redirects. `parseHTML()` returns the canonical URL. */
	url: string;
	/** HTTP status code of the final response. `parseHTML()` returns 0. */
	statusCode: number;
	/** og:title → twitter:title → Dublin Core → <title> → JSON-LD headline/name of the page's main entity */
	title: string | null;
	/** og:description → twitter:description → meta description → JSON-LD → Dublin Core */
	description: string | null;
	/** Preview image URL, resolved and filtered to http(s) */
	image: string | null;
	/** og:image:alt or twitter:image:alt */
	imageAlt: string | null;
	/** og:image:width, when numeric */
	imageWidth: number | null;
	/** og:image:height, when numeric */
	imageHeight: number | null;
	/** og:site_name → JSON-LD publisher → JSON-LD WebSite name → hostname */
	siteName: string;
	/** Declared favicon, or the origin's /favicon.ico as a fallback guess */
	favicon: string | null;
	/** og:type, defaults to "website" */
	mediaType: string;
	/** rel=canonical → og:url → fetched URL */
	canonicalUrl: string;
	/** JSON-LD author/creator → author meta tags → Dublin Core creator */
	author: string | null;
	/** og:locale */
	locale: string | null;
	/** <html lang> → content-language meta → og:locale language prefix */
	lang: string | null;
	/** article:published_time → JSON-LD datePublished → Dublin Core date */
	publishedDate: string | null;
	/** meta keywords, split on commas */
	keywords: string[] | null;
	/** og:video URL, filtered to http(s) */
	video: string | null;
	/** og:video:type MIME type (e.g. "video/mp4"); null when there is no video */
	videoType: string | null;
	/** og:audio URL, filtered to http(s) */
	audio: string | null;
	/** twitter:card type */
	twitterCard: string | null;
	/** twitter:site handle */
	twitterSite: string | null;
	/** twitter:creator handle */
	twitterCreator: string | null;
	/** twitter:player embed URL (an iframe page), filtered to http(s) */
	twitterPlayer: string | null;
	/** twitter:player:stream raw media URL, filtered to http(s) */
	twitterPlayerStream: string | null;
	/** theme-color meta value */
	themeColor: string | null;
	/** Discovered oEmbed endpoint URL. Not fetched. */
	oEmbedUrl: string | null;
	/**
	 * True when `maxBytes` cut the response before linkpeek saw everything it
	 * reads (the end of `<head>`, or the whole document with
	 * `includeBodyContent`), so later metadata may be missing. Raise `maxBytes`
	 * to recover it. `parseHTML()` returns false.
	 */
	truncated: boolean;
}
