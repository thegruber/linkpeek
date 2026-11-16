"use client";
import { Container } from "fumadocs-ui/layouts/docs/slots/container";
import { SidebarTrigger } from "fumadocs-ui/layouts/docs/slots/sidebar";
import type { ComponentProps } from "react";
import { SiteHeader } from "@/components/site-header";

// Docs pages get the same charcoal header as the homepage; the mobile
// sidebar trigger takes the place of its action cell. Fumadocs positions
// the sticky sidebar and table of contents below --fd-banner-height.
export function DocsContainer(props: ComponentProps<"div">) {
	return (
		<div className="[--fd-banner-height:3.5rem]">
			<SiteHeader
				menu={
					<SidebarTrigger
						aria-label="Open navigation"
						className="grid size-14 place-items-center bg-ink text-white"
					>
						<svg
							viewBox="0 0 16 16"
							aria-hidden="true"
							className="size-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
						>
							<path d="M2 4h12M2 8h12M2 12h12" />
						</svg>
					</SidebarTrigger>
				}
			/>
			<Container {...props} />
		</div>
	);
}
