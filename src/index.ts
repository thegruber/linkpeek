export { parseHTML } from "./parse.js";
export type { PreviewOptions, PreviewResult } from "./types.js";

import { fetchUrl, validateUrl } from "./fetch.js";
import { extractMetaRefreshUrl, parseHTML } from "./parse.js";
import type { PreviewOptions, PreviewResult } from "./types.js";

/** Pre-built option presets. Presets are plain objects — spread and override any field. */
export const presets = {
	/**
	 * Maximum speed — default behavior.
	 * 30KB limit, no body scan, no meta-refresh. 687ms avg, 69% quality.
	 */
	fast: {
		followMetaRefresh: false,
		includeBodyContent: false,
		maxBytes: 30_000,
	} satisfies PreviewOptions,
	/**
	 * Best quality — opt-in.
	 * 200KB limit, body JSON-LD + image fallback, meta-refresh support. 792ms avg, 75% quality.
	 */
	quality: {
		followMetaRefresh: true,
		includeBodyContent: true,
		maxBytes: 200_000,
	} satisfies PreviewOptions,
} as const;

/**
 * Extract link preview metadata from a URL.
 * Uses streaming fetch + SAX parsing for maximum speed.
 */
export async function preview(
	url: string,
	options: PreviewOptions = {},
): Promise<PreviewResult> {
	const { html, finalUrl, contentType, isHtml } = await fetchUrl(url, options);

	// Non-HTML response
	if (!isHtml) {
		const hostname = safeHostname(finalUrl);
		return {
			url: finalUrl,
			title: null,
			description: null,
			image: contentType.startsWith("image/") ? finalUrl : null,
			imageWidth: null,
			imageHeight: null,
			siteName: hostname,
			favicon: null,
			mediaType: contentType.split("/")[0] || "website",
			author: null,
			canonicalUrl: finalUrl,
			locale: null,
			publishedDate: null,
			video: contentType.startsWith("video/") ? finalUrl : null,
			twitterCard: null,
			twitterSite: null,
			themeColor: null,
			keywords: null,
			oEmbedUrl: null,
		};
	}

	let result = parseHTML(html, finalUrl, options);
	result.url = finalUrl;

	// Handle meta-refresh redirects (e.g. Cloudflare challenge pages)
	// Wrapped in try/catch so a failed redirect doesn't discard partial results
	if (!result.title && options.followMetaRefresh === true) {
		const refreshUrl = extractMetaRefreshUrl(html, finalUrl);
		if (refreshUrl && refreshUrl !== finalUrl) {
			try {
				validateUrl(refreshUrl, options.allowPrivateIPs);
				const refreshed = await fetchUrl(refreshUrl, options);
				if (refreshed.isHtml) {
					result = parseHTML(refreshed.html, refreshed.finalUrl, options);
					result.url = refreshed.finalUrl;
				}
			} catch {
				// Meta-refresh target unreachable or blocked — return what we have
			}
		}
	}

	return result;
}

function safeHostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}
