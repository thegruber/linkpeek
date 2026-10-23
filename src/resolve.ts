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
