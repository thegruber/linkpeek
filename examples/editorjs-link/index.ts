import { preview } from "linkpeek";

// Backend for the Editor.js link tool (@editorjs/link). The tool calls
// GET <endpoint>?url=<pasted link> and expects
// { success: 1, link?, meta: { title, description, image: { url } } }.
export async function fetchLinkData(url: string) {
	try {
		const result = await preview(url, { timeout: 5_000 });
		if (result.statusCode >= 400) return { success: 0 };
		return {
			success: 1,
			link: result.canonicalUrl,
			meta: {
				title: result.title ?? result.siteName,
				description: result.description ?? "",
				image: { url: result.image ?? "" },
				site_name: result.siteName,
				favicon: result.favicon,
			},
		};
	} catch {
		// Invalid URL, private address, timeout or network error.
		return { success: 0 };
	}
}

// A fetch handler that works as-is on Cloudflare Workers, Bun and Deno:
// export default { fetch: handleRequest }, Bun.serve({ fetch: handleRequest })
// or Deno.serve(handleRequest).
export async function handleRequest(request: Request): Promise<Response> {
	const url = new URL(request.url).searchParams.get("url");
	if (!url) return Response.json({ success: 0 }, { status: 400 });
	const data = await fetchLinkData(url);
	return Response.json(data, {
		headers: {
			"Cache-Control": data.success
				? "public, max-age=86400"
				: "public, max-age=300",
		},
	});
}

export default { fetch: handleRequest };
