import { execFileSync } from "node:child_process";
import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/shared";
import { pagePath, source } from "@/lib/source";

export const dynamic = "force-static";

// Last commit that touched a file, so crawlers see real change dates. The
// docs workflow checks out full history for this.
function lastModified(path: string): string | undefined {
	try {
		return (
			execFileSync("git", ["log", "-1", "--format=%cI", "--", path], {
				encoding: "utf8",
			}).trim() || undefined
		);
	} catch {
		return undefined;
	}
}

export default function sitemap(): MetadataRoute.Sitemap {
	return [
		{ url: siteUrl, lastModified: lastModified("app/(home)/page.tsx") },
		...source.getPages().map((page) => ({
			url: `${siteUrl}${pagePath(page).slice(1)}`,
			lastModified: lastModified(`content/docs/${page.path}`),
		})),
	];
}
