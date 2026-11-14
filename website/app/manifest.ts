import type { MetadataRoute } from "next";
import { basePath, home } from "@/lib/shared";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "linkpeek",
		short_name: "linkpeek",
		description: home.description,
		start_url: basePath,
		display: "browser",
		background_color: "#0d0f14",
		theme_color: "#165dff",
		icons: [
			{ src: `${basePath}favicon.svg`, type: "image/svg+xml", sizes: "any" },
			{ src: `${basePath}icon-512.png`, type: "image/png", sizes: "512x512" },
		],
	};
}
