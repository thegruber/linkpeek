// Request guards for the public preview endpoint. They are dependency-free so
// the repository's tests can exercise them against linkpeek's source.
import { isIP } from "node:net";

export const ALLOWED_ORIGINS = new Set([
	"https://thegruber.github.io",
	"http://localhost:3000",
	"http://localhost:4199",
]);

export const MAX_URL_LENGTH = 2048;

export type Lookup = (hostname: string) => Promise<string[]>;

export class BlockedAddressError extends Error {
	constructor(hostname: string) {
		super(`${hostname} resolves to a non-public address`);
		this.name = "BlockedAddressError";
	}
}

export type TargetResult =
	| { ok: true; url: string }
	| { ok: false; code: string; message: string };

/** Accepts only an absolute http(s) URL of bounded length, without credentials. */
export function readTarget(value: string | null): TargetResult {
	if (!value) return fail("MISSING_URL", "Pass a URL in the url parameter.");
	if (value.length > MAX_URL_LENGTH)
		return fail("URL_TOO_LONG", "The URL is longer than 2048 characters.");
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return fail("INVALID_URL", "This is not a valid URL.");
	}
	if (url.protocol !== "https:" && url.protocol !== "http:")
		return fail("UNSUPPORTED_PROTOCOL", "Only http and https URLs work.");
	if (url.username || url.password)
		return fail("INVALID_URL", "URLs with credentials are not accepted.");
	url.hash = "";
	return { ok: true, url: url.href };
}

/**
 * Wraps fetch so every request linkpeek makes, including each redirect hop,
 * first resolves the hostname and refuses non-public addresses. This closes
 * the "public hostname, private address" gap that linkpeek leaves to the
 * platform. A resolver that changes its answer between this lookup and the
 * connection (DNS rebinding) is still possible; the function has no private
 * network to reach, which is why that residual risk is acceptable here.
 */
export function guardedFetch(
	lookup: Lookup,
	isPrivateHost: (host: string) => boolean,
	baseFetch: typeof fetch = fetch,
): typeof fetch {
	return async (input, init) => {
		const href =
			typeof input === "string"
				? input
				: input instanceof URL
					? input.href
					: input.url;
		const hostname = new URL(href).hostname.replace(/^\[|\]$/g, "");
		if (!isIP(hostname)) {
			const addresses = await lookup(hostname);
			if (addresses.length === 0 || addresses.some(isPrivateHost)) {
				throw new BlockedAddressError(hostname);
			}
		}
		return baseFetch(input, init);
	};
}

function fail(code: string, message: string): TargetResult {
	return { ok: false, code, message };
}
