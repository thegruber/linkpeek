import type { PreviewOptions } from "./types.js";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function validateUrl(url: string, allowPrivateIPs = false): void {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new Error("Invalid URL");
	}

	if (!ALLOWED_PROTOCOLS.has(parsed.protocol))
		throw new Error("Only http and https URLs are supported");

	if (!allowPrivateIPs && isPrivateHost(parsed.hostname))
		throw new Error(
			"URLs pointing to private/internal networks are not allowed",
		);
}

export function isPrivateHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	if (
		h === "localhost" ||
		h === "[::1]" ||
		h.endsWith(".local") ||
		h.endsWith(".localhost")
	)
		return true;

	// IPv4 check
	const ipv4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
	if (ipv4) {
		const [, a, b] = ipv4.map(Number);
		if (a === 127 || a === 10 || a === 0) return true;
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 169 && b === 254) return true;
		return false;
	}

	// IPv6 check (bracketed or raw)
	const ipv6 = h.replace(/^\[|\]$/g, "").toLowerCase();
	if (ipv6 === "::1") return true;
	if (ipv6.startsWith("fc") || ipv6.startsWith("fd")) return true;
	if (ipv6.startsWith("fe80")) return true;
	return false;
}

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_MAX_BYTES = 30_000;
const DEFAULT_USER_AGENT = "Twitterbot/1.0";

export interface FetchResult {
	html: string;
	finalUrl: string;
	contentType: string;
	isHtml: boolean;
}

/**
 * Fetch a URL with streaming body, aborting after maxBytes.
 * Returns the HTML string and metadata about the response.
 */
export async function fetchUrl(
	url: string,
	options: PreviewOptions = {},
): Promise<FetchResult> {
	validateUrl(url, options.allowPrivateIPs);
	const timeout = options.timeout ?? DEFAULT_TIMEOUT;
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": userAgent,
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
				...options.headers,
			},
			redirect: options.followRedirects === false ? "manual" : "follow",
			signal: controller.signal,
		});

		const finalUrl = response.url || url;
		const contentType = response.headers.get("content-type") || "";
		const isHtml =
			contentType.includes("text/html") || contentType.includes("xhtml");

		if (!isHtml || !response.body) {
			return { html: "", finalUrl, contentType, isHtml };
		}

		// Stream body with byte limit
		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let totalBytes = 0;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			totalBytes += value.length;
			if (totalBytes >= maxBytes) break;
		}
		reader.cancel().catch(() => {});

		// Detect charset from content-type header (strip quotes if present)
		const charsetMatch = contentType.match(/charset=["']?([^"'\s;]+)/i);
		const charset = charsetMatch?.[1] || "utf-8";

		const combined = new Uint8Array(totalBytes);
		let offset = 0;
		for (const chunk of chunks) {
			combined.set(chunk, offset);
			offset += chunk.length;
		}

		let html: string;
		try {
			html = new TextDecoder(charset, { fatal: false }).decode(combined);
		} catch {
			// Unknown charset — fall back to utf-8
			html = new TextDecoder("utf-8", { fatal: false }).decode(combined);
		}

		return { html, finalUrl, contentType, isHtml };
	} finally {
		clearTimeout(timer);
	}
}
