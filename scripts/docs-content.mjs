import { DomUtils, parseDocument } from "htmlparser2";

// Derive both formats from the same authored HTML so examples and facts cannot
// drift between the human and machine-readable documentation.
export function documentationContent(html, canonical) {
	const document = parseDocument(html);
	const headings = DomUtils.getElementsByTagName("h2", document)
		.filter((node) => node.attribs.id)
		.map((node) => ({ id: node.attribs.id, text: DomUtils.textContent(node) }));
	return { headings, markdown: `${render(document).trim()}\n` };

	function render(node) {
		if (node.type === "text") return node.data.replace(/\s+/g, " ");
		if (node.type === "comment" || node.attribs?.role === "status") return "";
		const name = node.name;
		if (["script", "style", "button", "noscript"].includes(name)) return "";
		const children = () =>
			(node.children || []).map((child) => render(child)).join("");
		if (name === "pre" || name === "textarea") {
			const code = DomUtils.textContent(node).trim();
			const fence = "`".repeat(
				Math.max(3, ...(code.match(/`+/g) || []).map((s) => s.length + 1)),
			);
			return `\n\n${fence}\n${code}\n${fence}\n\n`;
		}
		if (name === "code") return `\`${DomUtils.textContent(node)}\``;
		if (/^h[1-6]$/.test(name))
			return `\n\n${"#".repeat(Number(name[1]))} ${DomUtils.textContent(node).trim()}\n\n`;
		if (name === "a" && node.attribs.href)
			return `[${children().trim()}](${new URL(node.attribs.href, canonical).href})`;
		if (name === "strong") return `**${children()}**`;
		if (name === "li") return `\n- ${children().trim()}\n`;
		if (name === "br") return "\n";
		if (name === "table") {
			const rows = DomUtils.getElementsByTagName("tr", node).map((row) =>
				(row.children || [])
					.filter((cell) => ["td", "th"].includes(cell.name))
					.map((cell) =>
						render(cell).trim().replaceAll("|", "\\|").replaceAll("\n", " "),
					),
			);
			if (!rows.length) return "";
			rows.splice(
				1,
				0,
				rows[0].map(() => "---"),
			);
			return `\n\n${rows.map((row) => `| ${row.join(" | ")} |`).join("\n")}\n\n`;
		}
		const text = children();
		return [
			"p",
			"section",
			"div",
			"article",
			"ul",
			"ol",
			"details",
			"summary",
		].includes(name)
			? `\n\n${text.trim()}\n\n`
			: text;
	}
}
