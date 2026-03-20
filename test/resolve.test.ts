import { describe, expect, it } from "vitest";
import { decodeEntities, resolveUrl } from "../src/resolve.js";

describe("decodeEntities", () => {
	it("decodes named entities", () => {
		expect(decodeEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
		expect(decodeEntities("a &lt; b &gt; c")).toBe("a < b > c");
		expect(decodeEntities("&quot;hello&quot;")).toBe('"hello"');
		expect(decodeEntities("it&#39;s fine")).toBe("it's fine");
		expect(decodeEntities("&apos;test&apos;")).toBe("'test'");
	});

	it("decodes decimal numeric entities", () => {
		expect(decodeEntities("&#169;")).toBe("\u00A9"); // copyright sign
		expect(decodeEntities("&#8212;")).toBe("\u2014"); // em dash
	});

	it("decodes hex numeric entities", () => {
		expect(decodeEntities("&#x2022;")).toBe("\u2022"); // bullet
		expect(decodeEntities("&#x26;")).toBe("&");
		expect(decodeEntities("&#x2019;")).toBe("\u2019"); // right single quote
	});

	it("returns empty/null input as-is", () => {
		expect(decodeEntities("")).toBe("");
		expect(decodeEntities(null as unknown as string)).toBe(null);
		expect(decodeEntities(undefined as unknown as string)).toBe(undefined);
	});

	it("leaves unknown named entities unchanged", () => {
		expect(decodeEntities("&unknownentity;")).toBe("&unknownentity;");
	});

	it("decodes common named entities", () => {
		expect(decodeEntities("&nbsp;")).toBe("\u00A0");
		expect(decodeEntities("&copy;")).toBe("\u00A9");
		expect(decodeEntities("&reg;")).toBe("\u00AE");
		expect(decodeEntities("&trade;")).toBe("\u2122");
		expect(decodeEntities("&ndash;")).toBe("\u2013");
		expect(decodeEntities("&mdash;")).toBe("\u2014");
		expect(decodeEntities("&lsquo;")).toBe("\u2018");
		expect(decodeEntities("&rsquo;")).toBe("\u2019");
		expect(decodeEntities("&ldquo;")).toBe("\u201C");
		expect(decodeEntities("&rdquo;")).toBe("\u201D");
		expect(decodeEntities("&hellip;")).toBe("\u2026");
		expect(decodeEntities("&euro;")).toBe("\u20AC");
		expect(decodeEntities("&pound;")).toBe("\u00A3");
		expect(decodeEntities("&yen;")).toBe("\u00A5");
		expect(decodeEntities("&cent;")).toBe("\u00A2");
		expect(decodeEntities("&times;")).toBe("\u00D7");
		expect(decodeEntities("&divide;")).toBe("\u00F7");
		expect(decodeEntities("&laquo;")).toBe("\u00AB");
		expect(decodeEntities("&raquo;")).toBe("\u00BB");
		expect(decodeEntities("&deg;")).toBe("\u00B0");
	});
});

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
