import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/shared";

export const dynamic = "force-static";

// Every crawler, search and AI alike, may read the docs; the sitemap lists them.
export default function robots(): MetadataRoute.Robots {
	return {
		rules: [{ userAgent: "*", allow: "/" }],
		sitemap: `${siteUrl}sitemap.xml`,
	};
}
