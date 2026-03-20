const HTML_ENTITIES: Record<string, string> = {
	"&amp;": "&",
	"&lt;": "<",
	"&gt;": ">",
	"&quot;": '"',
	"&#39;": "'",
	"&#x27;": "'",
	"&apos;": "'",
	"&#064;": "@",
	"&#x2022;": "\u2022",
	"&nbsp;": "\u00A0",
	"&copy;": "\u00A9",
	"&reg;": "\u00AE",
	"&trade;": "\u2122",
	"&ndash;": "\u2013",
	"&mdash;": "\u2014",
	"&lsquo;": "\u2018",
	"&rsquo;": "\u2019",
	"&ldquo;": "\u201C",
	"&rdquo;": "\u201D",
	"&hellip;": "\u2026",
	"&euro;": "\u20AC",
	"&pound;": "\u00A3",
	"&yen;": "\u00A5",
	"&cent;": "\u00A2",
	"&times;": "\u00D7",
	"&divide;": "\u00F7",
	"&laquo;": "\u00AB",
	"&raquo;": "\u00BB",
	"&deg;": "\u00B0",
};

/**
 * Decode HTML entities including named, decimal, and hex numeric entities.
 */
export function decodeEntities(str: string): string {
	if (!str) return str;
	return str.replace(/&(?:#x([0-9a-fA-F]+)|#(\d+)|[a-z]+);/gi, (match) => {
		// Known named/common entities
		const known = HTML_ENTITIES[match];
		if (known !== undefined) return known;
		// Hex numeric: &#xHH;
		if (match.startsWith("&#x") || match.startsWith("&#X")) {
			const code = Number.parseInt(match.slice(3, -1), 16);
			return Number.isNaN(code) ? match : String.fromCodePoint(code);
		}
		// Decimal numeric: &#DD;
		if (match.startsWith("&#")) {
			const code = Number.parseInt(match.slice(2, -1), 10);
			return Number.isNaN(code) ? match : String.fromCodePoint(code);
		}
		return match;
	});
}

/**
 * Resolve a potentially relative URL against a base URL.
 * Returns null if the path is falsy or invalid.
 */
export function resolveUrl(
	path: string | null | undefined,
	base: string,
): string | null {
	if (!path) return null;
	try {
		return new URL(path, base).href;
	} catch {
		return null;
	}
}
