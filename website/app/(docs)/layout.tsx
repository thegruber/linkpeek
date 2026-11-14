import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { DocsContainer } from "@/components/docs-container";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<DocsLayout
			tree={source.getPageTree()}
			{...baseOptions({ docs: true })}
			nav={{ enabled: false }}
			sidebar={{ collapsible: false }}
			slots={{ container: DocsContainer }}
		>
			{children}
		</DocsLayout>
	);
}
