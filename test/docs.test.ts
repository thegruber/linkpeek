import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DomUtils, parseDocument } from "htmlparser2";
import { expect, it } from "vitest";

// Exercise the published artifact boundary: broken base paths, missing machine
// documents, or dangling section links can strand both readers and crawlers.
it.each(["/linkpeek/", "/"])(
	"publishes a navigable HTML and Markdown documentation graph at %s",
	(base) => {
		const origin = "https://docs.example.com";
		execFileSync(process.execPath, ["scripts/build-docs.mjs"], {
			env: {
				...process.env,
				LINKPEEK_DOCS_ORIGIN: origin,
				LINKPEEK_DOCS_BASE: base,
			},
			stdio: "pipe",
		});
		const output = resolve("website/dist");
		const files = readdirSync(output, { recursive: true }).filter(
			(file): file is string =>
				typeof file === "string" && file.endsWith("index.html"),
		);
		expect(files.length).toBeGreaterThan(1);
		for (const file of files) {
			const html = readFileSync(resolve(output, file), "utf8");
			const document = parseDocument(html);
			const elements = DomUtils.getElementsByTagName("*", document);
			const canonical = elements.find(
				(node) => node.attribs.rel === "canonical",
			)?.attribs.href;
			expect(canonical).toBe(
				`${origin}${base}${file.replace(/index\.html$/, "")}`,
			);
			const alternate = elements.find(
				(node) => node.attribs.rel === "alternate",
			)?.attribs.href;
			expect(alternate).toBe(`${canonical}index.md`);
			const markdown = readFileSync(
				resolve(
					output,
					new URL(alternate as string).pathname.slice(base.length),
				),
				"utf8",
			);
			const headings = elements.filter((node) => /^h[12]$/.test(node.name));
			for (const heading of headings) {
				expect(markdown).toContain(DomUtils.textContent(heading).trim());
			}
			for (const code of DomUtils.getElementsByTagName("pre", document)) {
				expect(markdown).toContain(DomUtils.textContent(code).trim());
			}
			for (const element of elements) {
				const ref = element.attribs.href || element.attribs.src;
				if (!ref) continue;
				const url = new URL(ref, canonical);
				if (url.origin !== origin) continue;
				expect(url.pathname.startsWith(base), ref).toBe(true);
				const relative = url.pathname.slice(base.length);
				const target = resolve(
					output,
					relative.endsWith("/") || !relative
						? `${relative}index.html`
						: relative,
				);
				expect(existsSync(target), `${file}: ${ref}`).toBe(true);
				if (url.hash && target.endsWith(".html")) {
					const destination = parseDocument(readFileSync(target, "utf8"));
					expect(
						DomUtils.getElementById(
							decodeURIComponent(url.hash.slice(1)),
							destination,
						),
						`${file}: ${ref}`,
					).not.toBeNull();
				}
			}
			for (const script of elements.filter(
				(node) => node.attribs.type === "application/ld+json",
			)) {
				expect(() => JSON.parse(DomUtils.textContent(script))).not.toThrow();
			}
		}
		// The API documents two adjacent HTML tags. Losing their separator joins
		// the backtick delimiters and breaks Markdown's inline-code formatting.
		expect(readFileSync(resolve(output, "api/index.md"), "utf8")).toContain(
			'`<head>` `<meta http-equiv="refresh">`',
		);
		expect(readFileSync(resolve(output, "llms-full.txt"), "utf8")).toContain(
			"parseHTML",
		);
		expect(existsSync(resolve(output, "robots.txt"))).toBe(base === "/");
		expect(readFileSync(resolve(output, "404.html"), "utf8")).toContain(
			'content="noindex,follow"',
		);
	},
);
