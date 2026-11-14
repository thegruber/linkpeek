import { homeMarkdown, pageMarkdown } from "@/lib/llms";
import { source } from "@/lib/source";

// Writes out/md/<route>/index.md; scripts/postbuild.mjs moves each file next
// to its page so /<route>/index.md matches the previous site's URLs.
export const dynamic = "force-static";
export const dynamicParams = false;

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ slug: string[] }> },
) {
	const { slug } = await params;
	const slugs = slug.slice(0, -1);
	if (slugs.length === 0) return markdown(homeMarkdown());
	const page = source.getPage(slugs);
	if (!page) return new Response(null, { status: 404 });
	return markdown(await pageMarkdown(page));
}

export function generateStaticParams() {
	return [
		{ slug: ["index.md"] },
		...source.getPages().map((page) => ({ slug: [...page.slugs, "index.md"] })),
	];
}

function markdown(body: string) {
	return new Response(body, {
		headers: { "content-type": "text/markdown; charset=utf-8" },
	});
}
