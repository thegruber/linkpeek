export interface PreviewOptions {
	/** Request timeout in milliseconds (default: 8000) */
	timeout?: number;
	/** Maximum bytes to download (default: 30_000) */
	maxBytes?: number;
	/** User-Agent header (default: "Twitterbot/1.0") */
	userAgent?: string;
	/** Follow HTTP redirects (default: true) */
	followRedirects?: boolean;
	/** Extra request headers */
	headers?: Record<string, string>;
	/** Allow fetching private/internal IPs (default: false) */
	allowPrivateIPs?: boolean;
	/**
	 * Follow <meta http-equiv="refresh"> redirects when no title is found.
	 * Disabling this skips the extra HTTP round-trip at the cost of missing
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
	url: string;
	statusCode: number;
	title: string | null;
	description: string | null;
	image: string | null;
	imageAlt: string | null;
	imageWidth: number | null;
	imageHeight: number | null;
	siteName: string;
	favicon: string | null;
	mediaType: string;
	canonicalUrl: string;
	author: string | null;
	locale: string | null;
	lang: string | null;
	publishedDate: string | null;
	keywords: string[] | null;
	video: string | null;
	audio: string | null;
	twitterCard: string | null;
	twitterSite: string | null;
	twitterCreator: string | null;
	themeColor: string | null;
	oEmbedUrl: string | null;
}
