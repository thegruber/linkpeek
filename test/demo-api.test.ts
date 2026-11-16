import { describe, expect, it, vi } from "vitest";
import {
	BlockedAddressError,
	guardedFetch,
	readTarget,
} from "../demo-api/lib/guard.js";
import { isPrivateHost, LinkpeekError, preview } from "../src/index.js";

const html = `<html><head><title>Public page</title></head></html>`;
const ok = () =>
	vi.fn(
		async () =>
			new Response(html, { headers: { "content-type": "text/html" } }),
	);

describe("playground target validation", () => {
	it("accepts absolute http(s) URLs and drops the fragment", () => {
		expect(readTarget("https://example.com/a#b")).toEqual({
			ok: true,
			url: "https://example.com/a",
		});
	});

	it.each([
		[null, "MISSING_URL"],
		["", "MISSING_URL"],
		["example.com", "INVALID_URL"],
		["ftp://example.com/", "UNSUPPORTED_PROTOCOL"],
		["javascript:alert(1)", "UNSUPPORTED_PROTOCOL"],
		["https://user:pass@example.com/", "INVALID_URL"],
		[`https://example.com/${"a".repeat(2050)}`, "URL_TOO_LONG"],
	])("rejects %s", (value, code) => {
		const result = readTarget(value);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.code).toBe(code);
	});
});

describe("playground guarded fetch", () => {
	it.each([
		["10.0.0.7"],
		["127.0.0.1"],
		["169.254.169.254"],
		["::1"],
		["::ffff:127.0.0.1"],
		["fd00::1"],
	])("refuses a hostname that resolves to %s", async (address) => {
		const base = ok();
		const guarded = guardedFetch(async () => [address], isPrivateHost, base);
		await expect(guarded("https://internal.example/")).rejects.toBeInstanceOf(
			BlockedAddressError,
		);
		expect(base).not.toHaveBeenCalled();
	});

	it("refuses when any resolved address is private", async () => {
		const guarded = guardedFetch(
			async () => ["93.184.215.14", "10.0.0.1"],
			isPrivateHost,
			ok(),
		);
		await expect(guarded("https://mixed.example/")).rejects.toBeInstanceOf(
			BlockedAddressError,
		);
	});

	it("refuses hostnames without addresses", async () => {
		const guarded = guardedFetch(async () => [], isPrivateHost, ok());
		await expect(guarded("https://empty.example/")).rejects.toBeInstanceOf(
			BlockedAddressError,
		);
	});

	it("passes public hostnames and IP literals through", async () => {
		const base = ok();
		const lookup = vi.fn(async () => ["93.184.215.14"]);
		const guarded = guardedFetch(lookup, isPrivateHost, base);
		await guarded("https://example.com/");
		await guarded("https://93.184.215.14/");
		expect(lookup).toHaveBeenCalledTimes(1);
		expect(base).toHaveBeenCalledTimes(2);
	});

	it("checks every redirect hop that preview() follows", async () => {
		const base = vi.fn(async (input: string | URL | Request) =>
			new URL(String(input)).host === "start.example"
				? new Response(null, {
						status: 302,
						headers: { location: "https://rebind.example/" },
					})
				: new Response(html, { headers: { "content-type": "text/html" } }),
		);
		const lookup = async (host: string) =>
			host === "rebind.example" ? ["10.1.2.3"] : ["93.184.215.14"];
		const fetch = guardedFetch(
			lookup,
			isPrivateHost,
			base as typeof globalThis.fetch,
		);
		await expect(
			preview("https://start.example/", { fetch }),
		).rejects.toSatisfy(
			(error: unknown) =>
				error instanceof BlockedAddressError ||
				(error as { cause?: unknown }).cause instanceof BlockedAddressError,
		);
		expect(base).toHaveBeenCalledTimes(1);
	});

	it("still lets linkpeek reject private IP literals itself", async () => {
		const fetch = guardedFetch(async () => [], isPrivateHost, ok());
		await expect(
			preview("http://127.0.0.1/", { fetch }),
		).rejects.toBeInstanceOf(LinkpeekError);
	});
});
