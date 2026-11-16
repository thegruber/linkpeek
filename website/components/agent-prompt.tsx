"use client";
import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";

// Monochrome brand marks, the same ones Fumadocs uses in its page actions.
const CLAUDE_MARK =
	"M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z";
const CHATGPT_MARK =
	"M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z";

const OPEN_IN = [
	["Claude", "https://claude.ai/new?q=", CLAUDE_MARK],
	["ChatGPT", "https://chatgpt.com/?q=", CHATGPT_MARK],
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
					{OPEN_IN.map(([name, base, mark], index) => (
						<a
							key={name}
							href={`${base}${encodeURIComponent(ask)}`}
							target="_blank"
							rel="noopener noreferrer"
							className={`cell flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap border-ink px-4 font-mono text-[0.72rem] uppercase tracking-[0.06em] sm:flex-none sm:border-l ${index ? "border-l" : ""}`}
						>
							<svg
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
								className="size-3.5 shrink-0"
							>
								<path d={mark} />
							</svg>
							<span>
								<span className="hidden sm:inline">Open in&nbsp;</span>
								{name}
							</span>
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
							className={`col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${copied ? "opacity-0 blur-[2px]" : "opacity-100"}`}
						>
							<Copy className="size-3.5" strokeWidth={1.75} />
							<span>
								Copy<span className="hidden sm:inline">&nbsp;prompt</span>
							</span>
						</span>
						<span
							aria-hidden="true"
							className={`col-start-1 row-start-1 inline-flex items-center gap-2 whitespace-nowrap transition-[opacity,filter] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${copied ? "opacity-100" : "opacity-0 blur-[2px]"}`}
						>
							<Check className="size-3.5" strokeWidth={1.75} />
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
