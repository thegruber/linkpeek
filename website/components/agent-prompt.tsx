"use client";
import { useRef, useState } from "react";

const OPEN_IN = [
	["Claude", "https://claude.ai/new?q="],
	["ChatGPT", "https://chatgpt.com/?q="],
] as const;

// The ready-made task for coding agents: readable here, one click to copy,
// or opened straight in an assistant with the prompt filled in.
export function AgentPrompt({
	prompt,
	promptUrl,
	className = "",
}: {
	prompt: string;
	promptUrl: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const ask = `Read ${promptUrl} and help me add link previews to my app with linkpeek.`;
	return (
		<div className={`not-prose grid border border-ink ${className}`}>
			<div className="flex flex-wrap items-stretch justify-between border-ink border-b">
				<p className="flex items-center px-4 py-2.5 font-mono text-[0.72rem] uppercase tracking-[0.06em]">
					Prompt for your coding agent
				</p>
				<div className="flex w-full border-ink border-t sm:w-auto sm:border-t-0">
					{OPEN_IN.map(([name, base], index) => (
						<a
							key={name}
							href={`${base}${encodeURIComponent(ask)}`}
							target="_blank"
							rel="noopener noreferrer"
							className={`cell flex min-h-11 flex-1 items-center justify-center border-ink px-4 font-mono text-[0.72rem] uppercase tracking-[0.06em] sm:flex-none sm:border-l ${index ? "border-l" : ""}`}
						>
							<span className="hidden sm:inline">Open in&nbsp;</span>
							{name}
						</a>
					))}
					<button
						type="button"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(prompt);
								setCopied(true);
								clearTimeout(timer.current);
								timer.current = setTimeout(() => setCopied(false), 1600);
							} catch {
								setCopied(false);
							}
						}}
						aria-label={copied ? "Prompt copied" : "Copy prompt"}
						className="press grid min-h-11 min-w-[7.5rem] flex-1 place-items-center bg-ink sm:flex-none px-4 font-mono text-[0.72rem] text-white uppercase tracking-[0.06em] transition-[background-color,color,transform] hover:bg-mark hover:text-ink"
					>
						<span
							aria-hidden="true"
							className={`col-start-1 row-start-1 transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${copied ? "opacity-0 blur-[2px]" : "opacity-100"}`}
						>
							Copy prompt
						</span>
						<span
							aria-hidden="true"
							className={`col-start-1 row-start-1 transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${copied ? "opacity-100" : "opacity-0 blur-[2px]"}`}
						>
							Copied
						</span>
					</button>
				</div>
			</div>
			<pre className="m-0 max-h-[22rem] overflow-auto whitespace-pre-wrap bg-fd-card p-4 font-mono text-[0.78rem] leading-relaxed [overflow-wrap:anywhere]">
				{prompt}
			</pre>
		</div>
	);
}
