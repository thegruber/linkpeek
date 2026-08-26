export interface PreviewOptions {
	/** Request timeout in milliseconds, from 0 to 2_147_483_647 (default: 8000) */
	timeout?: number;
	/** Maximum bytes to download (default: 30_000) */
	maxBytes?: number;
	/** User-Agent header (default: "Twitterbot/1.0") */
	userAgent?: string;
	/** Follow HTTP redirects (default: true) */
	followRedirects?: boolean;
	/** Maximum HTTP redirects to follow; must be a non-negative integer (default: 10) */
	maxRedirects?: number;
	/** Extra non-sensitive request headers. Common credential-bearing headers are rejected. */
	headers?: Record<string, string>;
	/** Allow fetching private/internal IPs (default: false) */
	allowPrivateIPs?: boolean;
	/**
	 * Abort the request from the caller side. Combined with the timeout —
	 * whichever fires first wins. A caller abort is rethrown as-is; a timeout
	 * throws a LinkpeekError with code "TIMEOUT".
	 */
	signal?: AbortSignal;
	/**
	 * Custom fetch implementation, e.g. a proxy-aware or caching wrapper.
	 * It must honor RequestInit.redirect ("manual") and the supplied abort signal
	 * so redirects stay inside linkpeek's validation loop.
	 * (default: globalThis.fetch)
	 */
	fetch?: typeof globalThis.fetch;
	/**
	 * Follow <meta http-equiv="refresh"> redirects with a delay of 10 seconds
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

export interface PreviewResult {
	/** Final fetched URL after redirects. `parseHTML()` returns the canonical URL. */
	url: string;
	/** HTTP status code of the final response. `parseHTML()` returns 0. */
	statusCode: number;
	/** og:title → twitter:title → JSON-LD → Dublin Core → <title> */
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
	/** og:site_name → JSON-LD publisher → hostname */
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
	/** og:audio URL, filtered to http(s) */
	audio: string | null;
	/** twitter:card type */
	twitterCard: string | null;
	/** twitter:site handle */
	twitterSite: string | null;
	/** twitter:creator handle */
	twitterCreator: string | null;
	/** theme-color meta value */
	themeColor: string | null;
	/** Discovered oEmbed endpoint URL. Not fetched. */
	oEmbedUrl: string | null;
}
