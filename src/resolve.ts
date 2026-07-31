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

const MAX_CODE_POINT = 0x10ffff;
const SURROGATE_START = 0xd800;
const SURROGATE_END = 0xdfff;
const REPLACEMENT_CHAR = "�";

/**
 * Decode HTML entities including named, decimal, and hex numeric entities.
 * Out-of-range and surrogate code points become U+FFFD per the HTML spec.
 */
export function decodeEntities(str: string): string {
	if (!str) return str;
	return str.replace(/&(?:#x([0-9a-fA-F]+)|#(\d+)|[a-z]+);/gi, (match) => {
		// Known named/common entities
		const known = HTML_ENTITIES[match];
		if (known !== undefined) return known;
		// Hex numeric: &#xHH;
		if (match.startsWith("&#x") || match.startsWith("&#X")) {
			return numericEntity(Number.parseInt(match.slice(3, -1), 16), match);
		}
		// Decimal numeric: &#DD;
		if (match.startsWith("&#")) {
			return numericEntity(Number.parseInt(match.slice(2, -1), 10), match);
		}
		return match;
	});
}

function numericEntity(code: number, original: string): string {
	if (Number.isNaN(code)) return original;
	if (code > MAX_CODE_POINT) return REPLACEMENT_CHAR;
	if (code >= SURROGATE_START && code <= SURROGATE_END) return REPLACEMENT_CHAR;
	return String.fromCodePoint(code);
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

/**
 * Resolve a URL and only return browser-safe network URLs.
 */
export function resolveHttpUrl(
	path: string | null | undefined,
	base: string,
): string | null {
	const resolved = resolveUrl(path, base);
	if (!resolved) return null;

	try {
		const parsed = new URL(resolved);
		if (parsed.username || parsed.password) return null;
		return parsed.protocol === "http:" || parsed.protocol === "https:"
			? resolved
			: null;
	} catch {
		return null;
	}
}
