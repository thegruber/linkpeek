export type { LinkpeekErrorCode } from "./errors.js";
export { LinkpeekError } from "./errors.js";
export { isPrivateHost, validateUrl } from "./fetch.js";
export { parseHTML } from "./parse.js";
export type { PreviewOptions, PreviewResult } from "./types.js";

import { fetchUrl, validateUrl } from "./fetch.js";
import { extractMetaRefreshUrl, parseHTML } from "./parse.js";
import type { PreviewOptions, PreviewResult } from "./types.js";

/** Pre-built option presets. Presets are plain objects — spread and override any field. */
export const presets = {
	/**
	 * Maximum speed — default behavior.
	 * 30KB limit, no body scan, no meta-refresh.
	 */
	fast: {
		followMetaRefresh: false,
		includeBodyContent: false,
		maxBytes: 30_000,
	} satisfies PreviewOptions,
	/**
	 * Best quality — opt-in.
	 * 200KB limit, body JSON-LD + image fallback, meta-refresh support.
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
	const { html, finalUrl, contentType, isHtml, statusCode } = await fetchUrl(
		url,
		options,
	);

	// Non-HTML response: synthesize a minimal result from the content type
	if (!isHtml) {
		const result = emptyResult(finalUrl, statusCode, safeHostname(finalUrl));
		const mediaTypeHeader = contentType.toLowerCase().split(";", 1)[0].trim();
		result.mediaType = mediaTypeHeader.split("/")[0] || "website";
		if (mediaTypeHeader.startsWith("image/")) result.image = finalUrl;
		if (mediaTypeHeader.startsWith("video/")) result.video = finalUrl;
		if (mediaTypeHeader.startsWith("audio/")) result.audio = finalUrl;
		return result;
	}

	let result = parseHTML(html, finalUrl, options);
	result.url = finalUrl;
	result.statusCode = statusCode;

	// Handle meta-refresh redirects (e.g. interstitial or challenge pages).
	// Only fast refreshes (<= 10s) count as redirects; slow ones are reloads.
	// Wrapped in try/catch so a failed redirect doesn't discard partial results
	if (options.followMetaRefresh === true) {
		const refreshUrl = extractMetaRefreshUrl(html, finalUrl);
		if (refreshUrl && refreshUrl !== finalUrl) {
			try {
				validateUrl(refreshUrl, options.allowPrivateIPs);
				const refreshed = await fetchUrl(refreshUrl, options);
				if (refreshed.isHtml) {
					result = parseHTML(refreshed.html, refreshed.finalUrl, options);
					result.url = refreshed.finalUrl;
					result.statusCode = refreshed.statusCode;
				}
			} catch (error) {
				if (options.signal?.aborted) {
					throw options.signal.reason ?? error;
				}
				// Meta-refresh target unreachable or blocked — return what we have
			}
		}
	}

	return result;
}

function emptyResult(
	url: string,
	statusCode: number,
	siteName: string,
): PreviewResult {
	return {
		url,
		statusCode,
		title: null,
		description: null,
		image: null,
		imageAlt: null,
		imageWidth: null,
		imageHeight: null,
		siteName,
		favicon: null,
		mediaType: "website",
		canonicalUrl: url,
		author: null,
		locale: null,
		lang: null,
		publishedDate: null,
		keywords: null,
		video: null,
		audio: null,
		twitterCard: null,
		twitterSite: null,
		twitterCreator: null,
		themeColor: null,
		oEmbedUrl: null,
	};
}

function safeHostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}
