import { homeMarkdown, pageMarkdown } from "@/lib/llms";
import { siteUrl } from "@/lib/shared";
import { pagePath, source } from "@/lib/source";

export const dynamic = "force-static";

export async function GET() {
	const pages = await Promise.all(
		source
			.getPages()
			.map(
				async (page) =>
					`Source: ${siteUrl}${pagePath(page).slice(1)}\n\n${await pageMarkdown(page)}`,
			),
	);
	return new Response(
		[`Source: ${siteUrl}\n\n${homeMarkdown()}`, ...pages].join("\n\n---\n\n"),
		{ headers: { "content-type": "text/plain; charset=utf-8" } },
	);
}
