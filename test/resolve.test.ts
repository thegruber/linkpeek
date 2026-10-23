import { describe, expect, it } from "vitest";
import { resolveUrl } from "../src/resolve.js";

describe("resolveUrl", () => {
	const base = "https://example.com/articles/page";

	it("returns absolute URL as-is", () => {
		expect(resolveUrl("https://other.com/img.jpg", base)).toBe(
			"https://other.com/img.jpg",
		);
	});

	it("resolves relative URL against base", () => {
		expect(resolveUrl("/images/photo.png", base)).toBe(
			"https://example.com/images/photo.png",
		);
		expect(resolveUrl("../hero.jpg", base)).toBe(
			"https://example.com/hero.jpg",
		);
	});

	it("resolves protocol-relative URL", () => {
		expect(resolveUrl("//cdn.example.com/img.jpg", base)).toBe(
			"https://cdn.example.com/img.jpg",
		);
	});

	it("returns null for null/empty/undefined path", () => {
		expect(resolveUrl(null, base)).toBeNull();
		expect(resolveUrl("", base)).toBeNull();
		expect(resolveUrl(undefined, base)).toBeNull();
	});

	it("returns null for invalid URL with invalid base", () => {
		expect(resolveUrl(":::invalid", "not-a-url")).toBeNull();
	});
});
