"use client";
import { useState } from "react";

export function InstallCommand({
	command = "npm install linkpeek",
	tone = "plain",
}: {
	command?: string;
	tone?: "plain" | "signal";
}) {
	const [copied, setCopied] = useState(false);
	const signal = tone === "signal";
	return (
		<div
			className={`flex w-full items-stretch border font-mono text-sm ${signal ? "border-white/40 text-white" : "border-rule bg-fd-background"}`}
		>
			<span
				aria-hidden="true"
				className={`flex select-none items-center pl-4 ${signal ? "text-white/70" : "text-fd-muted-foreground"}`}
			>
				$
			</span>
			<code className="flex flex-1 items-center truncate px-3 py-3">
				{command}
			</code>
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
				className={`min-w-[5.5rem] border-l px-4 font-sans text-xs transition-colors active:translate-y-px ${signal ? "border-white/40 hover:bg-white hover:text-signal" : "border-rule text-fd-muted-foreground hover:bg-fd-foreground hover:text-fd-background"}`}
			>
				{copied ? "Copied" : "Copy"}
			</button>
		</div>
	);
}
