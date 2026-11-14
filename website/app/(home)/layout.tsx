import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { packageVersion } from "@/lib/version";

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<>
			<SiteHeader version={packageVersion} />
			{children}
		</>
	);
}
