import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/shared";
import { pagePath, source } from "@/lib/source";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: siteUrl, priority: 1 },
		...source.getPages().map((page) => ({
			url: `${siteUrl}${pagePath(page).slice(1)}`,
			priority: page.slugs[0] === "integrations" ? 0.6 : 0.8,
		})),
	];
}
