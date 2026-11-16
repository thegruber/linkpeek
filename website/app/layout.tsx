import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Provider } from "@/components/provider";
import { appName, basePath, home, siteUrl } from "@/lib/shared";
import "./global.css";

const sans = Geist({
	subsets: ["latin"],
	variable: "--font-geist",
	display: "swap",
});
const mono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-geist-mono",
	display: "swap",
});

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	// Google Search Console ownership for the https://linkpeek.js.org/ property.
	verification: { google: "D2ageLtUwNc5SZGtDscdfpXlhs-eElcJdYHeaR5F9io" },
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
	icons: {
		icon: [
			{ url: `${basePath}favicon.svg`, type: "image/svg+xml" },
			{ url: `${basePath}icon-512.png`, type: "image/png", sizes: "512x512" },
		],
		apple: { url: `${basePath}apple-touch-icon.png`, sizes: "180x180" },
	},
	manifest: `${basePath}manifest.webmanifest`,
	openGraph: { siteName: appName, type: "website", locale: "en_US" },
	twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
	themeColor: "#ffffff",
	colorScheme: "light",
};

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
			className={`${sans.variable} ${mono.variable}`}
			suppressHydrationWarning
		>
			<body className="flex min-h-screen flex-col">
				<Provider>{children}</Provider>
			</body>
		</html>
	);
}
