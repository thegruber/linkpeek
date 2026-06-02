import type { PreviewOptions } from "./types.js";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const DEFAULT_MAX_REDIRECTS = 10;
const SENSITIVE_REQUEST_HEADERS = new Set([
	"authorization",
	"proxy-authorization",
	"cookie",
	"set-cookie",
	"api-key",
	"apikey",
	"x-api-key",
	"x-api-token",
	"x-auth-token",
	"x-access-token",
	"access-token",
	"x-amz-security-token",
	"x-goog-api-key",
	"x-csrf-token",
	"x-xsrf-token",
]);

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
	const h = hostname.toLowerCase().replace(/\.$/, "");
	if (
		h === "localhost" ||
		h === "[::1]" ||
		h === "::1" ||
		h.endsWith(".local") ||
		h.endsWith(".localhost")
	)
		return true;

	const ipv4 = parseIPv4(h);
	if (ipv4) {
		return isPrivateIPv4(ipv4);
	}

	const ipv6 = h.replace(/^\[|\]$/g, "").toLowerCase();
	const ipv6Parts = parseIPv6(ipv6);
	if (ipv6Parts) return isPrivateIPv6(ipv6Parts);

	return false;
}

function parseIPv4(hostname: string): number[] | null {
	const parts = hostname.split(".");
	if (parts.length !== 4) return null;

	const bytes = parts.map((part) => {
		if (!/^\d+$/.test(part)) return Number.NaN;
		const value = Number.parseInt(part, 10);
		return value >= 0 && value <= 255 ? value : Number.NaN;
	});

	return bytes.some(Number.isNaN) ? null : bytes;
}

function isPrivateIPv4([a, b, c]: number[]): boolean {
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
	if (a === 198 && (b === 18 || b === 19)) return true;
	if (a === 198 && b === 51 && c === 100) return true;
	if (a === 203 && b === 0 && c === 113) return true;
	if (a >= 224) return true;
	return false;
}

function parseIPv6(hostname: string): number[] | null {
	if (!hostname.includes(":")) return null;
	const host = hostname.split("%", 1)[0];
	const doubleColonParts = host.split("::");
	if (doubleColonParts.length > 2) return null;

	const left = parseIPv6Section(doubleColonParts[0]);
	const right = parseIPv6Section(doubleColonParts[1] ?? "");
	if (!left || !right) return null;

	const missing = 8 - left.length - right.length;
	if (doubleColonParts.length === 1 && missing !== 0) return null;
	if (doubleColonParts.length === 2 && missing < 0) return null;

	return [...left, ...Array.from({ length: missing }, () => 0), ...right];
}

function parseIPv6Section(section: string): number[] | null {
	if (!section) return [];

	const parts = section.split(":");
	const values: number[] = [];
	for (const part of parts) {
		if (!part) return null;
		if (part.includes(".")) {
			const ipv4 = parseIPv4(part);
			if (!ipv4) return null;
			values.push((ipv4[0] << 8) | ipv4[1], (ipv4[2] << 8) | ipv4[3]);
			continue;
		}
		if (!/^[\da-f]{1,4}$/i.test(part)) return null;
		values.push(Number.parseInt(part, 16));
	}

	return values;
}

function isPrivateIPv6(parts: number[]): boolean {
	if (parts.length !== 8) return false;

	const [first, second] = parts;
	const isUnspecified = parts.every((part) => part === 0);
	const isLoopback =
		parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1;
	if (isUnspecified || isLoopback) return true;

	if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
	if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
	if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
	if (first === 0x2001 && second === 0x0db8) return true; // documentation
	if (first === 0x2001 && second === 0) return true; // 2001::/32 Teredo
	if (first === 0x0100 && second === 0) return true; // 100::/64 discard
	if (first === 0x0064 && second === 0xff9b && parts[2] === 1) return true; // 64:ff9b:1::/48 local-use translation

	const isIPv4Mapped =
		parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
	if (isIPv4Mapped) {
		return isPrivateIPv4(ipv4FromWords(parts[6], parts[7]));
	}

	const isIPv4Compatible = parts.slice(0, 6).every((part) => part === 0);
	if (isIPv4Compatible) return isPrivateIPv4(ipv4FromWords(parts[6], parts[7]));

	const isIPv4Translated =
		parts.slice(0, 4).every((part) => part === 0) &&
		parts[4] === 0xffff &&
		parts[5] === 0;
	if (isIPv4Translated) return isPrivateIPv4(ipv4FromWords(parts[6], parts[7]));

	const isNat64WellKnown =
		first === 0x0064 &&
		second === 0xff9b &&
		parts.slice(2, 6).every((part) => part === 0);
	if (isNat64WellKnown) return isPrivateIPv4(ipv4FromWords(parts[6], parts[7]));

	const is6to4 = first === 0x2002;
	if (is6to4) return isPrivateIPv4(ipv4FromWords(parts[1], parts[2]));

	return false;
}

function ipv4FromWords(high: number, low: number): number[] {
	return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_MAX_BYTES = 30_000;
const DEFAULT_USER_AGENT = "Twitterbot/1.0";

export interface FetchResult {
	html: string;
	finalUrl: string;
	contentType: string;
	isHtml: boolean;
	statusCode: number;
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
	const maxBytes = normalizeMaxBytes(options.maxBytes ?? DEFAULT_MAX_BYTES);
	const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
	const headers = buildRequestHeaders(userAgent, options.headers);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);

	try {
		let currentUrl = url;
		let redirectCount = 0;

		while (true) {
			const response = await fetch(currentUrl, {
				headers,
				redirect: "manual",
				signal: controller.signal,
			});

			if (
				options.followRedirects !== false &&
				REDIRECT_STATUSES.has(response.status)
			) {
				const location = response.headers.get("location");
				if (location) {
					if (redirectCount >= DEFAULT_MAX_REDIRECTS)
						throw new Error("Too many redirects");
					const nextUrl = new URL(location, currentUrl).href;
					await response.body?.cancel().catch(() => {});
					validateUrl(nextUrl, options.allowPrivateIPs);
					currentUrl = nextUrl;
					redirectCount++;
					continue;
				}
			}

			return await readFetchResponse(
				response,
				currentUrl,
				Math.max(0, maxBytes),
			);
		}
	} finally {
		clearTimeout(timer);
	}
}

function normalizeMaxBytes(maxBytes: number): number {
	if (!Number.isFinite(maxBytes)) {
		throw new Error("maxBytes must be a finite number");
	}
	return Math.max(0, Math.floor(maxBytes));
}

function buildRequestHeaders(
	userAgent: string,
	headers: Record<string, string> | undefined,
): Record<string, string> {
	const requestHeaders: Record<string, string> = {
		"User-Agent": userAgent,
		Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.5",
	};

	for (const [name, value] of Object.entries(headers ?? {})) {
		const headerName = name.trim();
		if (isSensitiveRequestHeader(headerName)) {
			throw new Error("Sensitive request headers are not allowed");
		}
		requestHeaders[headerName] = value;
	}

	return requestHeaders;
}

function isSensitiveRequestHeader(name: string): boolean {
	const normalized = name.toLowerCase();
	return (
		SENSITIVE_REQUEST_HEADERS.has(normalized) ||
		normalized.endsWith("-authorization")
	);
}

async function readFetchResponse(
	response: Response,
	currentUrl: string,
	maxBytes: number,
): Promise<FetchResult> {
	const finalUrl = response.url || currentUrl;
	const statusCode = response.status;
	const contentType = response.headers.get("content-type") || "";
	const normalizedContentType = contentType.toLowerCase();
	const isHtml =
		normalizedContentType.includes("text/html") ||
		normalizedContentType.includes("xhtml");

	if (!isHtml || !response.body) {
		return { html: "", finalUrl, contentType, isHtml, statusCode };
	}

	// Stream body with byte limit
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let totalBytes = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		const remaining = maxBytes - totalBytes;
		if (remaining <= 0) break;
		const chunk = value.length > remaining ? value.slice(0, remaining) : value;
		chunks.push(chunk);
		totalBytes += chunk.length;
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

	return { html, finalUrl, contentType, isHtml, statusCode };
}
