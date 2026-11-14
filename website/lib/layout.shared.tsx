import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";
import { npmUrl, repository } from "./shared";

// The docs sidebar already lists every page, so it only adds the npm link.
export function baseOptions({ docs = false } = {}): BaseLayoutProps {
	return {
		nav: { title: <Logo />, url: "/" },
		githubUrl: repository,
		links: [
			...(docs
				? []
				: [
						{ text: "Docs", url: "/quick-start/" },
						{ text: "Benchmarks", url: "/benchmarks/" },
					]),
			{ text: "npm", url: npmUrl, external: true },
		],
	};
}
