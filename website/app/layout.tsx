import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { Provider } from "@/components/provider";
import { appName, basePath, home, siteUrl } from "@/lib/shared";
import "./global.css";

const grotesk = Schibsted_Grotesk({
	subsets: ["latin"],
	variable: "--font-grotesk",
	display: "swap",
});
const code = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-code",
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: `${home.title} · ${appName}`,
		template: `%s · ${appName}`,
	},
	description: home.description,
	applicationName: appName,
	authors: [{ name: "Adrian Gruber" }],
	keywords: [
		"link preview",
		"url metadata",
		"open graph",
		"open graph scraper",
		"twitter card",
		"json-ld",
		"unfurl",
		"typescript",
		"edge runtime",
	],
	icons: { icon: { url: `${basePath}favicon.svg`, type: "image/svg+xml" } },
	openGraph: { siteName: appName, type: "website", locale: "en_US" },
	twitter: { card: "summary_large_image" },
	robots: { index: true, follow: true, "max-image-preview": "large" },
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
		{ media: "(prefers-color-scheme: dark)", color: "#0d0f14" },
	],
	colorScheme: "light dark",
};

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`${grotesk.variable} ${code.variable}`}
			suppressHydrationWarning
		>
			<body className="flex min-h-screen flex-col">
				<Provider>{children}</Provider>
			</body>
		</html>
	);
}
