export type { LinkpeekErrorCode } from "./errors.js";
export { LinkpeekError } from "./errors.js";
export { isPrivateHost, validateUrl } from "./fetch.js";
export { parseHTML } from "./parse.js";
export type { PreviewOptions, PreviewResult } from "./types.js";

import { createFetchContext, type FetchResult, fetchUrl } from "./fetch.js";
import { extractMetaRefreshUrl, parseHTML } from "./parse.js";
import type { PreviewOptions, PreviewResult } from "./types.js";

/** Pre-built option presets. Presets are plain objects — spread and override any field. */
export const presets: {
	/**
	 * Maximum speed — default behavior.
	 * 30KB limit, no body scan, no meta-refresh.
	 */
	readonly fast: {
		followMetaRefresh: false;
		includeBodyContent: false;
		maxBytes: number;
	};
	/**
	 * Best quality — opt-in.
	 * 200KB limit, body JSON-LD + image fallback, meta-refresh support.
	 */
	readonly quality: {
		followMetaRefresh: true;
		includeBodyContent: true;
		maxBytes: number;
	};
} = {
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
	// One deadline and one redirect budget cover HTTP redirects and the
	// optional meta-refresh hop.
	const context = createFetchContext(url, options);
	try {
		const fetched = await fetchUrl(url, options, context);
		if (!fetched.isHtml) return mediaResult(fetched);

		let result = htmlResult(fetched, options);

		// Handle meta-refresh redirects (e.g. interstitial or challenge pages).
		// Only fast refreshes (<= 10s) count as redirects; slow ones are reloads.
		// A failed or timed-out refresh keeps the interstitial's partial result.
		if (
			options.followMetaRefresh === true &&
			context.redirects < context.maxRedirects
		) {
			const refreshUrl = extractMetaRefreshUrl(fetched.html, fetched.finalUrl);
			if (refreshUrl && refreshUrl !== fetched.finalUrl) {
				try {
					context.redirects++;
					const refreshed = await fetchUrl(refreshUrl, options, context);
					if (refreshed.isHtml) result = htmlResult(refreshed, options);
				} catch (error) {
					if (options.signal?.aborted) {
						throw options.signal.reason ?? error;
					}
				}
			}
		}

		return result;
	} finally {
		context.dispose();
	}
}

function htmlResult(
	fetched: FetchResult,
	options: PreviewOptions,
): PreviewResult {
	const result = parseHTML(fetched.html, fetched.finalUrl, options);
	result.url = fetched.finalUrl;
	result.statusCode = fetched.statusCode;
	result.truncated = fetched.truncated;
	return result;
}

/** Non-HTML response: synthesize a minimal result from the content type. */
function mediaResult({
	finalUrl,
	statusCode,
	contentType,
}: FetchResult): PreviewResult {
	const result = emptyResult(finalUrl, statusCode, safeHostname(finalUrl));
	const mediaTypeHeader = contentType.toLowerCase().split(";", 1)[0].trim();
	result.mediaType = mediaTypeHeader.split("/")[0] || "website";
	if (mediaTypeHeader.startsWith("image/")) result.image = finalUrl;
	if (mediaTypeHeader.startsWith("video/")) {
		result.video = finalUrl;
		result.videoType = mediaTypeHeader;
	}
	if (mediaTypeHeader.startsWith("audio/")) result.audio = finalUrl;
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
		videoType: null,
		audio: null,
		twitterCard: null,
		twitterSite: null,
		twitterCreator: null,
		themeColor: null,
		oEmbedUrl: null,
		truncated: false,
	};
}

function safeHostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return "";
	}
}
