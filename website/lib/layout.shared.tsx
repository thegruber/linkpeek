import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Logo } from "@/components/logo";
import { npmUrl, repository } from "./shared";

// The site header carries the logo, main links, GitHub and npm, so the docs
// sidebar only lists pages. The site is light only, like a printed sheet.
export function baseOptions(
	_options: { docs?: boolean } = {},
): BaseLayoutProps {
	return {
		nav: { title: <Logo />, url: "/" },
		themeSwitch: { enabled: false },
		// Shown in the mobile docs menu, where the header has no room for them.
		links: [
			{ text: "GitHub", url: repository, external: true },
			{ text: "npm", url: npmUrl, external: true },
		],
	};
}
