import { lookup } from "node:dns/promises";
import { isPrivateHost, LinkpeekError, preview } from "linkpeek";
import {
	ALLOWED_ORIGINS,
	BlockedAddressError,
	guardedFetch,
	readTarget,
} from "../lib/guard.js";

// GET /api/preview?url=https://example.com
// Public demo endpoint for the docs site. Defense in depth:
// - only the docs origins may call it (CORS plus an Origin check);
// - the Vercel firewall rate-limits /api/preview per IP;
// - linkpeek validates every URL and redirect, and the guarded fetch also
//   refuses hostnames that resolve to non-public addresses;
// - short timeout, small byte limit, metadata-only response;
// - successful results are cached at the edge for a day, so repeated URLs
//   never reach the function.
const fetchPublicOnly = guardedFetch(
	async (hostname) =>
		(await lookup(hostname, { all: true, verbatim: true })).map(
			(entry) => entry.address,
		),
	isPrivateHost,
);

export async function GET(request: Request): Promise<Response> {
	const origin = request.headers.get("origin");
	if (!origin || !ALLOWED_ORIGINS.has(origin)) {
		return json(
			403,
			{
				error: "FORBIDDEN_ORIGIN",
				message: "This endpoint serves the linkpeek docs.",
			},
			null,
			"no-store",
		);
	}
	const target = readTarget(new URL(request.url).searchParams.get("url"));
	if (!target.ok) {
		return json(
			400,
			{ error: target.code, message: target.message },
			origin,
			SHORT_CACHE,
		);
	}

	const started = performance.now();
	try {
		const result = await preview(target.url, {
			fetch: fetchPublicOnly,
			timeout: 5000,
			maxRedirects: 5,
		});
		return json(
			200,
			{
				title: result.title,
				description: result.description,
				image: result.image,
				favicon: result.favicon,
				siteName: result.siteName,
				canonicalUrl: result.canonicalUrl,
				statusCode: result.statusCode,
				ms: Math.round(performance.now() - started),
			},
			origin,
			result.statusCode < 400
				? "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"
				: SHORT_CACHE,
		);
	} catch (error) {
		const code =
			error instanceof LinkpeekError
				? error.code
				: error instanceof BlockedAddressError ||
						(error as { cause?: unknown })?.cause instanceof BlockedAddressError
					? "PRIVATE_NETWORK_BLOCKED"
					: "FETCH_FAILED";
		const message =
			code === "PRIVATE_NETWORK_BLOCKED"
				? "This address is not public, so linkpeek will not fetch it."
				: code === "TIMEOUT"
					? "The site did not answer within 5 seconds."
					: code === "FETCH_FAILED"
						? "The site could not be reached."
						: "linkpeek rejected this URL.";
		return json(422, { error: code, message }, origin, SHORT_CACHE);
	}
}

const SHORT_CACHE = "public, max-age=0, s-maxage=300";

function json(
	status: number,
	body: unknown,
	origin: string | null,
	cacheControl: string,
): Response {
	const headers: Record<string, string> = {
		"content-type": "application/json; charset=utf-8",
		"cache-control": cacheControl,
		"x-content-type-options": "nosniff",
		vary: "Origin",
	};
	if (origin) headers["access-control-allow-origin"] = origin;
	return new Response(JSON.stringify(body), { status, headers });
}
