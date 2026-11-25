import { Parser } from "htmlparser2";
import { LinkpeekError } from "./errors.js";
import { createHeadBoundaryDetector } from "./parse.js";
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

/**
 * Validate a URL before fetching it: requires `http:` or `https:`, rejects
 * embedded credentials, and blocks private/internal hosts unless
 * `allowPrivateIPs` is true.
 *
 * @throws {LinkpeekError} `INVALID_URL`, `UNSUPPORTED_PROTOCOL`, or
 * `PRIVATE_NETWORK_BLOCKED`.
 */
export function validateUrl(url: string, allowPrivateIPs = false): void {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		throw new LinkpeekError("INVALID_URL", "Invalid URL");
	}

	if (!ALLOWED_PROTOCOLS.has(parsed.protocol))
		throw new LinkpeekError(
			"UNSUPPORTED_PROTOCOL",
			"Only http and https URLs are supported",
		);

	if (parsed.username || parsed.password)
		throw new LinkpeekError(
			"INVALID_URL",
			"URLs with embedded credentials are not allowed",
		);

	if (!allowPrivateIPs && isPrivateUrlHost(parsed.hostname))
		throw new LinkpeekError(
			"PRIVATE_NETWORK_BLOCKED",
			"URLs pointing to private/internal networks are not allowed",
		);
}

// Special-use and de facto internal names (RFC 6761, RFC 6762 appendix G,
// RFC 8375, ICANN .internal). Public sites never live under these.
const INTERNAL_NAME_SUFFIXES = [
	"localhost",
	"local",
	"localdomain",
	"internal",
	"intranet",
	"private",
	"corp",
	"home",
	"lan",
	"home.arpa",
];

/**
 * True for loopback, private, link-local, reserved and internal hosts.
 * Accepts a URL hostname, a bare IPv6 address or any IPv4 spelling the WHATWG
 * URL parser accepts (`127.1`, `0x7f000001`, `2130706433`, `0177.0.0.1`), and
 * normalises it exactly as `fetch()` would before checking. Single-label names
 * such as `metadata` resolve through local search domains and count as
 * internal. Unparseable hosts return true.
 */
export function isPrivateHost(hostname: string): boolean {
	const raw = hostname.trim();
	const bracketed =
		raw.includes(":") && !raw.startsWith("[") ? `[${raw}]` : raw;
	let host: string;
	try {
		host = new URL(`http://${bracketed}/`).hostname;
	} catch {
		return true;
	}
	return isPrivateUrlHost(host);
}

/** isPrivateHost for a hostname the URL parser already normalised. */
function isPrivateUrlHost(hostname: string): boolean {
	const host = hostname.replace(/\.+$/, "");
	if (!host) return true;

	if (host.startsWith("[")) {
		const ipv6Parts = parseIPv6(host.slice(1, -1));
		return ipv6Parts ? isPrivateIPv6(ipv6Parts) : true;
	}

	const ipv4 = parseIPv4(host);
	if (ipv4) return isPrivateIPv4(ipv4);

	if (!host.includes(".")) return true;
	for (const suffix of INTERNAL_NAME_SUFFIXES) {
		if (host === suffix || host.endsWith(`.${suffix}`)) return true;
	}
	return false;
}

/** True when a URL hostname is an IP literal (DNS lookup is not needed). */
function isIpLiteral(hostname: string): boolean {
	return hostname.startsWith("[") || parseIPv4(hostname) !== null;
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

function isPrivateIPv4([a, b, c, d]: number[]): boolean {
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 192 && b === 0 && c === 0) return d !== 9 && d !== 10;
	if (a === 192 && b === 0 && c === 2) return true;
	if (a === 192 && b === 88 && c === 99) return true;
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
	if (first === 0x2001 && (second & 0xfe00) === 0)
		return !isGlobalProtocolAssignment(parts); // 2001::/23
	if (first === 0x2001 && second === 0x0db8) return true; // documentation
	if (first === 0x3fff && (second & 0xf000) === 0) return true; // 3fff::/20 documentation
	if (first === 0x0100 && second === 0 && parts[2] === 0 && parts[3] === 0)
		return true; // 100::/64 discard
	if (first === 0x0100 && second === 0 && parts[2] === 0 && parts[3] === 1)
		return true; // 100:0:0:1::/64 dummy prefix
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

	// IANA currently allocates only 2000::/3 for ordinary global unicast.
	// Special globally reachable translation/mapping forms return above.
	if ((first & 0xe000) !== 0x2000) return true;

	return false;
}

function isGlobalProtocolAssignment(parts: number[]): boolean {
	const [, second, third] = parts;
	if (second === 0x0001) {
		const isSpecialAddress = parts.slice(2, 7).every((part) => part === 0);
		return isSpecialAddress && parts[7] >= 1 && parts[7] <= 3;
	}
	if (second === 0x0003) return true; // 2001:3::/32
	if (second === 0x0004 && third === 0x0112) return true; // 2001:4:112::/48
	if ((second & 0xfff0) === 0x0020) return true; // 2001:20::/28
	if ((second & 0xfff0) === 0x0030) return true; // 2001:30::/28
	return false;
}

function ipv4FromWords(high: number, low: number): number[] {
	return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

const DEFAULT_TIMEOUT = 8000;
const MAX_TIMEOUT = 2_147_483_647;
const DEFAULT_MAX_BYTES = 30_000;
const DEFAULT_USER_AGENT = "Twitterbot/1.0";

export interface FetchResult {
	html: string;
	finalUrl: string;
	contentType: string;
	isHtml: boolean;
	statusCode: number;
	/** maxBytes stopped reading before the head (or, with body content, the document) ended. */
	truncated: boolean;
}

/**
 * Per-call state shared by every request one `preview()` makes: one deadline,
 * one abort signal and one redirect budget, so a meta refresh cannot restart
 * the timeout or the redirect count.
 */
export interface FetchContext {
	readonly signal: AbortSignal;
	readonly timeout: number;
	readonly maxRedirects: number;
	readonly startUrl: string;
	readonly startOrigin: string;
	redirects: number;
	timedOut: boolean;
	dispose(): void;
}

/**
 * Validate options and start the call deadline. Callers must `dispose()` the
 * context. Throws the caller's abort reason when the signal is already aborted.
 */
export function createFetchContext(
	url: string,
	options: PreviewOptions = {},
): FetchContext {
	validateUrl(url, options.allowPrivateIPs);
	const timeout = normalizeTimeout(options.timeout ?? DEFAULT_TIMEOUT);
	const maxRedirects = normalizeMaxRedirects(
		options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
	);
	const external = options.signal;
	if (external?.aborted) {
		throw (
			external.reason ??
			new DOMException("This operation was aborted", "AbortError")
		);
	}

	const controller = new AbortController();
	const onExternalAbort = () => controller.abort(external?.reason);
	external?.addEventListener("abort", onExternalAbort, { once: true });
	const context: FetchContext = {
		signal: controller.signal,
		timeout,
		maxRedirects,
		startUrl: url,
		startOrigin: new URL(url).origin,
		redirects: 0,
		timedOut: false,
		dispose() {
			clearTimeout(timer);
			external?.removeEventListener("abort", onExternalAbort);
		},
	};
	const timer = setTimeout(() => {
		context.timedOut = true;
		controller.abort();
	}, timeout);
	return context;
}

/**
 * Fetch a URL with a streaming body, stopping after the head when possible and
 * always enforcing maxBytes on retained decoded response-body bytes.
 * Returns the HTML string and metadata about the response.
 */
/** response.url resolved against the request, without its fragment. */
function reportedUrl(value: string, base: string): string | undefined {
	if (!value) return undefined;
	try {
		return withoutHash(new URL(value, base).href);
	} catch {
		return undefined;
	}
}

function withoutHash(value: string): string {
	const url = new URL(value);
	url.hash = "";
	return url.href;
}

export async function fetchUrl(
	url: string,
	options: PreviewOptions = {},
	sharedContext?: FetchContext,
): Promise<FetchResult> {
	const context = sharedContext ?? createFetchContext(url, options);
	try {
		// createFetchContext already validated the starting URL.
		if (url !== context.startUrl) validateUrl(url, options.allowPrivateIPs);
		const maxBytes = normalizeMaxBytes(options.maxBytes ?? DEFAULT_MAX_BYTES);
		const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
		const fetchImpl = options.fetch ?? fetch;
		const headers = buildRequestHeaders(userAgent, options.headers);
		// Custom headers stay on the starting origin; cross-origin redirects get
		// defaults only so per-site headers cannot leak to arbitrary hosts.
		const crossOriginHeaders = options.headers
			? buildRequestHeaders(userAgent, undefined)
			: headers;

		// Only await when a resolver is set: an extra tick before fetch() would
		// let a caller abort land before the request starts.
		const checksDns = !!options.resolveHost && !options.allowPrivateIPs;
		let currentUrl = url;
		while (true) {
			if (checksDns)
				await checkResolvedHost(currentUrl, options, context.signal);
			const sameOrigin = new URL(currentUrl).origin === context.startOrigin;
			const response = await fetchImpl(currentUrl, {
				headers: sameOrigin ? headers : crossOriginHeaders,
				redirect: "manual",
				signal: context.signal,
			});

			if (
				options.followRedirects !== false &&
				REDIRECT_STATUSES.has(response.status)
			) {
				const location = response.headers.get("location");
				if (location) {
					await response.body?.cancel().catch(() => {});
					if (context.redirects >= context.maxRedirects)
						throw new LinkpeekError("TOO_MANY_REDIRECTS", "Too many redirects");
					let nextUrl: string;
					try {
						nextUrl = new URL(location, currentUrl).href;
					} catch {
						throw new LinkpeekError("INVALID_URL", "Invalid URL");
					}
					validateUrl(nextUrl, options.allowPrivateIPs);
					currentUrl = nextUrl;
					context.redirects++;
					continue;
				}
			}

			// A custom fetch that ignored redirect: "manual" reports where it
			// ended up; that target never passed through the checks above.
			// Compared without the fragment and after URL normalisation, so a
			// fetch that merely reports "https://Example.com" as
			// "https://example.com/" is not checked a second time.
			const reported = reportedUrl(response.url, currentUrl);
			if (reported && reported !== withoutHash(currentUrl)) {
				try {
					validateUrl(reported, options.allowPrivateIPs);
					if (checksDns)
						await checkResolvedHost(reported, options, context.signal);
				} catch (error) {
					response.body?.cancel().catch(() => {});
					throw error;
				}
				currentUrl = reported;
			}

			return await readFetchResponse(
				response,
				currentUrl,
				maxBytes,
				options.includeBodyContent !== true,
			);
		}
	} catch (err) {
		if (err instanceof LinkpeekError) throw err;
		if (context.timedOut)
			throw new LinkpeekError(
				"TIMEOUT",
				`Request timed out after ${context.timeout}ms`,
				{ cause: err },
			);
		if (options.signal?.aborted) throw err;
		throw new LinkpeekError(
			"FETCH_FAILED",
			`Request failed: ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	} finally {
		if (!sharedContext) context.dispose();
	}
}

/**
 * Opt-in DNS check: resolve the hop's hostname with the caller's resolver and
 * refuse private answers. Platform fetch still performs its own lookup, so this
 * narrows DNS rebinding to the gap between the two lookups.
 */
async function checkResolvedHost(
	url: string,
	options: PreviewOptions,
	signal: AbortSignal,
): Promise<void> {
	if (!options.resolveHost) return;
	const { hostname } = new URL(url);
	if (isIpLiteral(hostname)) return;
	let addresses: string[];
	try {
		addresses = await abortable(options.resolveHost(hostname), signal);
	} catch (error) {
		if (signal.aborted) throw error;
		throw new LinkpeekError("FETCH_FAILED", `Could not resolve ${hostname}`, {
			cause: error,
		});
	}
	if (!Array.isArray(addresses) || addresses.length === 0)
		throw new LinkpeekError("FETCH_FAILED", `Could not resolve ${hostname}`);
	if (addresses.some((address) => isPrivateHost(address)))
		throw new LinkpeekError(
			"PRIVATE_NETWORK_BLOCKED",
			"URLs pointing to private/internal networks are not allowed",
		);
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
	if (signal.aborted) return Promise.reject(signal.reason);
	return new Promise((resolve, reject) => {
		const onAbort = () => reject(signal.reason);
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then(resolve, reject).finally(() => {
			signal.removeEventListener("abort", onAbort);
		});
	});
}

function normalizeMaxBytes(maxBytes: number): number {
	if (!Number.isFinite(maxBytes)) {
		throw new LinkpeekError(
			"INVALID_OPTIONS",
			"maxBytes must be a finite number",
		);
	}
	return Math.max(0, Math.floor(maxBytes));
}

function normalizeTimeout(timeout: number): number {
	if (!Number.isFinite(timeout) || timeout < 0 || timeout > MAX_TIMEOUT) {
		throw new LinkpeekError(
			"INVALID_OPTIONS",
			`timeout must be between 0 and ${MAX_TIMEOUT} milliseconds`,
		);
	}
	return timeout;
}

function normalizeMaxRedirects(maxRedirects: number): number {
	if (!Number.isSafeInteger(maxRedirects) || maxRedirects < 0) {
		throw new LinkpeekError(
			"INVALID_OPTIONS",
			"maxRedirects must be a non-negative integer",
		);
	}
	return maxRedirects;
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
			throw new LinkpeekError(
				"SENSITIVE_HEADER",
				"Sensitive request headers are not allowed",
			);
		}
		// Replace defaults case-insensitively so e.g. "user-agent" overrides
		// "User-Agent" instead of fetch merging both into one header.
		const normalized = headerName.toLowerCase();
		for (const existing of Object.keys(requestHeaders)) {
			if (existing.toLowerCase() === normalized)
				delete requestHeaders[existing];
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
	finalUrl: string,
	maxBytes: number,
	stopAfterHead: boolean,
): Promise<FetchResult> {
	const statusCode = response.status;
	const contentType = response.headers.get("content-type") || "";
	const normalizedContentType = contentType.toLowerCase();
	// No Content-Type: sniff the first bytes like a browser would.
	let sniffing = normalizedContentType.trim() === "";
	let isHtml =
		normalizedContentType.includes("text/html") ||
		normalizedContentType.includes("xhtml");

	if ((!isHtml && !sniffing) || !response.body || maxBytes === 0) {
		// Drain unused bodies so the connection is released immediately.
		response.body?.cancel().catch(() => {});
		return {
			html: "",
			finalUrl,
			contentType,
			isHtml,
			statusCode,
			truncated: false,
		};
	}

	// Unknown labels (charset=bogus) fall through to the document prescan.
	const headerCharset = supportedEncoding(extractHeaderCharset(contentType));

	// Stream body with byte limit
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let totalBytes = 0;
	let hitLimit = false;
	const headDetector = stopAfterHead ? createHeadBoundaryDetector() : null;
	let headDecoder: TextDecoder | null = null;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		const remaining = maxBytes - totalBytes;
		const cut = value.length > remaining;
		const chunk = cut ? value.slice(0, remaining) : value;
		chunks.push(chunk);
		totalBytes += chunk.length;

		if (sniffing) {
			const verdict = sniffHtml(combineChunks(chunks, totalBytes), false);
			if (verdict === false) break;
			if (verdict === true) {
				sniffing = false;
				isHtml = true;
			}
		}

		if (headDetector && !sniffing) {
			if (headDecoder) {
				headDetector.write(headDecoder.decode(chunk, { stream: true }));
			} else if (totalBytes >= 3 || totalBytes >= maxBytes) {
				// Wait only for a possible split BOM. ASCII-compatible encodings
				// share the head markup; final text decoding uses the full prescan.
				const buffered = combineChunks(chunks, totalBytes);
				headDecoder = createTextDecoder(detectCharset(headerCharset, buffered));
				headDetector.write(headDecoder.decode(buffered, { stream: true }));
			}
			if (headDetector.headClosed) break;
		}
		if (totalBytes >= maxBytes) {
			// A body that ends exactly at the limit was not cut: look once.
			hitLimit = cut || !(await reader.read()).done;
			break;
		}
	}
	reader.cancel().catch(() => {});

	const combined = combineChunks(chunks, totalBytes);
	if (sniffing && sniffHtml(combined, true)) isHtml = true;
	if (headDetector && !headDecoder && isHtml) {
		headDecoder = createTextDecoder(detectCharset(headerCharset, combined));
		headDetector.write(headDecoder.decode(combined, { stream: true }));
	}
	if (!isHtml) {
		return {
			html: "",
			finalUrl,
			contentType,
			isHtml,
			statusCode,
			truncated: false,
		};
	}

	const html = createTextDecoder(detectCharset(headerCharset, combined)).decode(
		combined,
	);
	// In fast mode a cut only matters when it came before the head ended.
	const truncated = hitLimit && !headDetector?.headClosed;

	return { html, finalUrl, contentType, isHtml, statusCode, truncated };
}

// WHATWG MIME sniffing patterns for HTML (plus <meta>, which many pages
// start with), matched case-insensitively after leading whitespace and a BOM.
const HTML_SNIFF_PATTERN =
	/^<(?:!doctype html|html|head|script|iframe|h1|div|font|table|a|style|title|b|body|br|p|meta)[\s>/]|^<!--/i;

/** true: HTML, false: not HTML, null: need more bytes. */
function sniffHtml(bytes: Uint8Array, final: boolean): boolean | null {
	let start = 0;
	if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
	// The first bytes of a BOM split across chunks: wait for the rest.
	else if (
		!final &&
		bytes.length < 3 &&
		bytes[0] === 0xef &&
		(bytes.length < 2 || bytes[1] === 0xbb)
	)
		return null;
	while (
		start < bytes.length &&
		(bytes[start] === 0x09 ||
			bytes[start] === 0x0a ||
			bytes[start] === 0x0c ||
			bytes[start] === 0x0d ||
			bytes[start] === 0x20)
	)
		start++;
	const head = new TextDecoder("latin1").decode(
		bytes.subarray(start, start + 16),
	);
	if (HTML_SNIFF_PATTERN.test(head)) return true;
	if (final || head.length >= 16 || (head && head[0] !== "<")) return false;
	return null;
}

function combineChunks(chunks: Uint8Array[], totalBytes: number): Uint8Array {
	if (chunks.length === 1) return chunks[0];
	const combined = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		combined.set(chunk, offset);
		offset += chunk.length;
	}
	return combined;
}

function createTextDecoder(charset: string): TextDecoder {
	try {
		return new TextDecoder(charset, { fatal: false });
	} catch {
		// Unknown charset — fall back to utf-8
		return new TextDecoder("utf-8", { fatal: false });
	}
}

function supportedEncoding(label: string | null): string | null {
	if (!label) return null;
	try {
		return new TextDecoder(label).encoding;
	} catch {
		return null;
	}
}

function extractHeaderCharset(contentType: string): string | null {
	return contentType.match(/charset=["']?([^"'\s;]+)/i)?.[1] ?? null;
}

// How many leading bytes to scan for a <meta charset> declaration when the
// Content-Type header does not specify one (mirrors browser prescan behavior).
const CHARSET_PRESCAN_BYTES = 1024;

function detectCharset(
	headerCharset: string | null,
	bytes: Uint8Array,
): string {
	// A BOM takes precedence over HTTP and document declarations.
	// Byte order marks
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xef &&
		bytes[1] === 0xbb &&
		bytes[2] === 0xbf
	)
		return "utf-8";
	if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe)
		return "utf-16le";
	if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
		return "utf-16be";

	if (headerCharset) return headerCharset;

	// Parse only the bounded prescan: comments and raw script/style text must
	// not masquerade as encoding declarations.
	let charset: string | null = null;
	let templateDepth = 0;
	const parser = new Parser(
		{
			onopentag(name, attrs) {
				if (name === "template") templateDepth++;
				if (templateDepth || name !== "meta") return;
				const candidate =
					attrs.charset ||
					((attrs["http-equiv"] || "").toLowerCase() === "content-type"
						? extractHeaderCharset(attrs.content || "")
						: null);
				if (!candidate) return;
				try {
					const encoding = new TextDecoder(candidate).encoding;
					// HTML meta declarations cannot switch an ASCII document to UTF-16.
					charset = encoding.startsWith("utf-16") ? "utf-8" : encoding;
					parser.pause();
				} catch {
					/* Ignore unsupported declarations and continue scanning. */
				}
			},
			onclosetag(name) {
				if (name === "template" && templateDepth) templateDepth--;
			},
		},
		{ decodeEntities: true },
	);
	parser.write(
		new TextDecoder("latin1").decode(bytes.subarray(0, CHARSET_PRESCAN_BYTES)),
	);
	if (charset) return charset;

	return "utf-8";
}
