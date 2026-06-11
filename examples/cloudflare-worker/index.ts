import { preview } from "linkpeek";

export default {
	async fetch(request: Request): Promise<Response> {
		const { searchParams } = new URL(request.url);
		const url = searchParams.get("url");

		if (!url) {
			return Response.json(
				{ error: "Missing ?url= parameter" },
				{ status: 400 },
			);
		}

		try {
			const result = await preview(url);
			// Only cache successful previews — 4xx/5xx pages return a result
			// with their statusCode instead of throwing.
			const cacheControl =
				result.statusCode >= 200 && result.statusCode < 300
					? "public, max-age=3600"
					: "no-store";
			return Response.json(result, {
				headers: { "Cache-Control": cacheControl },
			});
		} catch (err) {
			return Response.json(
				{
					error: err instanceof Error ? err.message : "Failed to fetch preview",
				},
				{ status: 422 },
			);
		}
	},
};
