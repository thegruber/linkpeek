"use client";
import { useRef, useState } from "react";

export function InstallCommand({
	command = "npm install linkpeek",
	tone = "plain",
}: {
	command?: string;
	tone?: "plain" | "dark" | "block";
}) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const signal = tone === "dark";
	return (
		<div
			className={`flex w-full min-w-0 items-stretch border font-mono text-sm ${signal ? "border-white/40 text-white" : tone === "block" ? "border-ink bg-white" : "border-rule bg-fd-background"}`}
		>
			<span
				aria-hidden="true"
				className={`flex select-none items-center pl-4 ${signal ? "text-white/70" : "text-fd-muted-foreground"}`}
			>
				$
			</span>
			<code className="flex min-w-0 flex-1 items-center px-3 py-3 [overflow-wrap:anywhere] xl:whitespace-nowrap">
				{command}
			</code>
			<button
				type="button"
				onClick={async () => {
					try {
						await navigator.clipboard.writeText(command);
						setCopied(true);
						clearTimeout(timer.current);
						timer.current = setTimeout(() => setCopied(false), 1600);
					} catch {
						setCopied(false);
					}
				}}
				aria-label={copied ? "Copied" : "Copy install command"}
				className={`press relative grid min-w-[5.5rem] place-items-center border-l px-4 font-mono text-xs transition-[background-color,color,transform] ${signal ? "border-white/40 hover:bg-white hover:text-signal-text" : "border-rule text-fd-muted-foreground hover:bg-fd-foreground hover:text-fd-background"}`}
			>
				{/* Both labels share one cell; a short blur bridges the swap. */}
				<span
					aria-hidden="true"
					className={`col-start-1 row-start-1 transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${copied ? "opacity-0 blur-[2px]" : "opacity-100"}`}
				>
					Copy
				</span>
				<span
					aria-hidden="true"
					className={`col-start-1 row-start-1 transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${copied ? "opacity-100" : "opacity-0 blur-[2px]"}`}
				>
					Copied
				</span>
			</button>
		</div>
	);
}
