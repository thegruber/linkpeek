"use client";
import { useCallback, useEffect, useState } from "react";

const SAMPLE = `<head>
  <meta property="og:title"
    content="Example article">
  <meta property="og:description"
    content="An example article description.">
  <meta property="og:image" content="/cover.png">
</head>`;

const INITIAL = `{
  "title": "Example article",
  "description": "An example article description.",
  "image": "https://example.com/cover.png",
  "siteName": "example.com",
  "statusCode": 0
}`;

// parseHTML() runs locally on whatever the reader types; nothing is fetched.
export function ParserDemo() {
	const [html, setHtml] = useState(SAMPLE);
	const [includeBody, setIncludeBody] = useState(false);
	const [output, setOutput] = useState(INITIAL);
	const [status, setStatus] = useState("Sample output is shown.");

	const extract = useCallback(async () => {
		try {
			const { parseHTML } = await import("linkpeek");
			// Keep local demo work bounded.
			const result = parseHTML(html.slice(0, 30_000), "https://example.com/", {
				includeBodyContent: includeBody,
			});
			setOutput(
				JSON.stringify(
					{
						title: result.title,
						description: result.description,
						image: result.image,
						siteName: result.siteName,
						statusCode: result.statusCode,
					},
					null,
					2,
				),
			);
			setStatus("Metadata extracted locally.");
		} catch {
			setStatus("Could not parse this sample. Try a smaller HTML document.");
		}
	}, [html, includeBody]);

	useEffect(() => {
		const timer = setTimeout(extract, 200);
		return () => clearTimeout(timer);
	}, [extract]);

	return (
		<div className="not-prose my-6 grid gap-4 md:grid-cols-2">
			<form
				className="grid content-start gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					void extract();
				}}
			>
				<label htmlFor="sample-html" className="font-medium text-sm">
					HTML input
				</label>
				<textarea
					id="sample-html"
					spellCheck={false}
					maxLength={30_000}
					rows={9}
					value={html}
					onChange={(event) => setHtml(event.target.value)}
					className="w-full resize-y rounded-xl border bg-fd-card p-4 font-mono text-[0.8rem] leading-relaxed outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal-wash"
				/>
				<label className="flex min-h-11 items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={includeBody}
						onChange={(event) => setIncludeBody(event.target.checked)}
						className="size-4 accent-signal"
					/>
					Include body JSON-LD and image fallback
				</label>
				<p className="text-fd-muted-foreground text-xs">
					Base URL <code>https://example.com/</code>. Nothing is fetched; the
					input stays in this page.
				</p>
			</form>
			<div className="grid content-start gap-3">
				<p className="font-medium text-sm">
					Result{" "}
					<span className="font-normal text-fd-muted-foreground" role="status">
						{status}
					</span>
				</p>
				<pre className="overflow-x-auto rounded-xl border bg-fd-card p-4 font-mono text-[0.8rem] leading-relaxed">
					<code>{output}</code>
				</pre>
				<p className="text-fd-muted-foreground text-xs">
					<code>statusCode: 0</code> means the HTML was parsed without a network
					request.
				</p>
			</div>
		</div>
	);
}
