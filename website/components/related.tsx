import Link from "next/link";

type Item = [label: string, href: string, note?: string];

// The "next step" block at the end of every docs page: a row of linked
// cells in the site grid, external links marked with an arrow.
export function Related({ items }: { items: Item[] }) {
	return (
		<nav
			aria-label="Related"
			className={`not-prose mt-12 grid border-ink border-t border-l ${items.length % 3 === 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
		>
			{items.map(([label, href, note]) => {
				const external = /^https?:/.test(href);
				const className =
					"cell group flex min-h-20 flex-col justify-between gap-3 border-ink border-r border-b px-4 py-3.5";
				const body = (
					<>
						<span className="font-mono text-[0.68rem] text-fd-muted-foreground uppercase tracking-[0.06em]">
							{note ?? (external ? "External" : "Read next")}
						</span>
						<span className="flex items-center justify-between gap-3 font-medium text-[0.95rem] tracking-tight">
							{label}
							<svg
								viewBox="0 0 16 16"
								aria-hidden="true"
								className="cell-arrow size-4 shrink-0"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
							>
								<path
									d={external ? "M5 11 11 5M6 5h5v5" : "M3 8h10M9 4l4 4-4 4"}
								/>
							</svg>
						</span>
					</>
				);
				return external ? (
					<a key={href} href={href} className={className}>
						{body}
					</a>
				) : (
					<Link key={href} href={href} className={className}>
						{body}
					</Link>
				);
			})}
		</nav>
	);
}
