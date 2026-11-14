import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { z } from "zod";

const docs = defineDocs({
	dir: "content/docs",
	docs: {
		schema: pageSchema.extend({
			// The visible H1 when it differs from the SEO title.
			heading: z.string().optional(),
			// The <title> and social title when the sidebar label is shorter.
			metaTitle: z.string().optional(),
		}),
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
	meta: {
		schema: metaSchema,
	},
});

export const source = loader({
	baseUrl: "/",
	source: docs.toFumadocsSource(),
});

/**
 * A page's path with the trailing slash the site is exported with
 * (`trailingSlash: true`), matching the previous site's URLs.
 */
export function pagePath(page: { url: string }): string {
	return page.url.endsWith("/") ? page.url : `${page.url}/`;
}
