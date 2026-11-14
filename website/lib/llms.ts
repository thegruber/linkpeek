import {
	benchmarkDate,
	benchmarkEnvironment,
	benchmarkMethod,
	benchmarkNotes,
	benchmarkVersions,
	type ChartKind,
	chartMarkdown,
	highlightsMarkdown,
} from "./benchmarks";
import { home, siteUrl } from "./shared";
import { pagePath, source } from "./source";

type Page = NonNullable<ReturnType<typeof source.getPage>>;

// Components render charts and demos in HTML; the Markdown exports get the
// same numbers as tables, and interactive demos are dropped.
const replacements: [RegExp, (...groups: string[]) => string][] = [
	[
		/<BenchmarkChart kind="(large|small|install)" \/>/g,
		(_, kind) => chartMarkdown(kind as ChartKind),
	],
	[/<BenchmarkHighlights \/>/g, () => highlightsMarkdown()],
	[/<BenchmarkDate \/>/g, () => benchmarkDate],
	[
		/<BenchmarkMethod \/>/g,
		() =>
			[
				`The packages run on a local server, so these numbers isolate library overhead; they do not predict latency against real websites. ${benchmarkMethod}`,
				"",
				`Environment: ${benchmarkEnvironment}. Versions: ${benchmarkVersions.map((item) => `\`${item.name}@${item.version}\``).join(", ")}.`,
				"",
				...benchmarkNotes.map(([name, note]) => `- \`${name}\`: ${note}`),
			].join("\n"),
	],
	[/<(ParserDemo|LiveResult) \/>\n*/g, () => ""],
	[
		/```package-install\n(.+)\n```/g,
		(_, name) => `\`\`\`bash\nnpm install ${name}\n\`\`\``,
	],
];

export async function pageMarkdown(page: Page): Promise<string> {
	let text = await page.data.getText("processed");
	for (const [pattern, replace] of replacements) {
		text = text.replace(pattern, replace);
	}
	text = text
		.replace(/\]\(\/(?!\/)/g, `](${siteUrl}`)
		.replace(/ \[#[\w-]+\]$/gm, "");
	return `# ${page.data.heading ?? page.data.metaTitle ?? page.data.title}\n\n> ${page.data.description}\n\n${text.trim()}\n`;
}

export function homeMarkdown(): string {
	return `# linkpeek

> ${home.description}

linkpeek turns a URL into its title, description, image and favicon from Open Graph, Twitter Card and JSON-LD. It reads only the page head, blocks private addresses by default, and runs on Node.js 22.12+, Bun, Deno and fetch-compatible edge runtimes. One runtime dependency.

\`\`\`bash
npm install linkpeek
\`\`\`

\`\`\`ts
import { preview } from "linkpeek";

const card = await preview("https://example.com/article");
if (card.statusCode < 400) {
  console.log(card.title, card.description, card.image);
}
\`\`\`

## Performance

Measured on ${benchmarkDate} against five other link preview packages.

${highlightsMarkdown()}

${chartMarkdown("large")}

## Documentation

${source
	.getPages()
	.map(
		(page) =>
			`- [${page.data.metaTitle ?? page.data.title}](${siteUrl}${pagePath(page).slice(1)}): ${page.data.description}`,
	)
	.join("\n")}
`;
}
