"use client";
import { useState } from "react";

export function InstallCommand({
	command = "npm install linkpeek",
}: {
	command?: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="flex w-full max-w-md items-center gap-3 rounded-xl border bg-fd-card py-2 pr-2 pl-4 font-mono text-sm">
			<span aria-hidden="true" className="select-none text-fd-muted-foreground">
				$
			</span>
			<code className="flex-1 truncate text-fd-foreground">{command}</code>
			<button
				type="button"
				onClick={async () => {
					try {
						await navigator.clipboard.writeText(command);
						setCopied(true);
						setTimeout(() => setCopied(false), 1600);
					} catch {
						setCopied(false);
					}
				}}
				className="min-h-9 rounded-lg border bg-fd-background px-3 font-sans text-fd-muted-foreground text-xs transition-colors hover:border-signal hover:text-fd-foreground active:translate-y-px"
			>
				{copied ? "Copied" : "Copy"}
			</button>
		</div>
	);
}
