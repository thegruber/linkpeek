import { afterEach, describe, expect, it, vi } from "vitest";
import { LinkpeekError } from "../src/errors.js";
import { fetchUrl } from "../src/fetch.js";

const encoder = new TextEncoder();

function htmlResponse(chunks: string[], init: ResponseInit = {}): Response {
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			for (const chunk of chunks) {
				controller.enqueue(encoder.encode(chunk));
			}
			controller.close();
		},
	});

	return new Response(stream, {
		...init,
		headers: {
			"content-type": "text/html; charset=utf-8",
			...init.headers,
		},
	});
}

describe("fetchUrl", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("enforces maxBytes exactly when a stream chunk crosses the limit", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => htmlResponse(["abc", "defgh"])),
		);

		const result = await fetchUrl("https://example.com", { maxBytes: 5 });

		expect(result.html).toBe("abcde");
	});

	it("rejects non-finite maxBytes before fetching", async () => {
		const fetchMock = vi.fn(async () => htmlResponse(["abcdef"]));
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			fetchUrl("https://example.com", { maxBytes: Number.NaN }),
		).rejects.toThrow("maxBytes must be a finite number");
		await expect(
			fetchUrl("https://example.com", { maxBytes: Number.POSITIVE_INFINITY }),
		).rejects.toThrow("maxBytes must be a finite number");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("detects HTML content types case-insensitively", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(encoder.encode("<title>Case</title>"), {
						status: 200,
						headers: { "content-type": "Text/HTML; Charset=UTF-8" },
					}),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.isHtml).toBe(true);
		expect(result.html).toBe("<title>Case</title>");
	});

	it("forwards non-sensitive custom headers", async () => {
		const fetchMock = vi.fn(async () => htmlResponse(["<title>ok</title>"]));
		vi.stubGlobal("fetch", fetchMock);

		await fetchUrl("https://example.com", {
			headers: { "X-Preview-Locale": "en-US" },
		});

		expect(fetchMock).toHaveBeenCalledWith(
			"https://example.com",
			expect.objectContaining({
				headers: expect.objectContaining({ "X-Preview-Locale": "en-US" }),
			}),
		);
	});

	it("rejects credential-bearing custom headers", async () => {
		const fetchMock = vi.fn(async () => htmlResponse(["<title>ok</title>"]));
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			fetchUrl("https://example.com", {
				headers: { Authorization: "Bearer test-value" },
			}),
		).rejects.toThrow("Sensitive request headers are not allowed");
		await expect(
			fetchUrl("https://example.com", {
				headers: { Cookie: "session=test-value" },
			}),
		).rejects.toThrow("Sensitive request headers are not allowed");
		await expect(
			fetchUrl("https://example.com", {
				headers: { "X-Api-Key": "test-value" },
			}),
		).rejects.toThrow("Sensitive request headers are not allowed");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("follows public redirects manually and reports the final URL", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { location: "/next" },
				}),
			)
			.mockResolvedValueOnce(htmlResponse(["<title>Redirected</title>"]));
		vi.stubGlobal("fetch", fetchMock);

		const result = await fetchUrl("https://example.com/start");

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock).toHaveBeenNthCalledWith(
			2,
			"https://example.com/next",
			expect.objectContaining({ redirect: "manual" }),
		);
		expect(result.finalUrl).toBe("https://example.com/next");
		expect(result.statusCode).toBe(200);
	});

	it("cancels redirect response bodies before following", async () => {
		let canceled = false;
		const redirectBody = new ReadableStream<Uint8Array>({
			cancel() {
				canceled = true;
			},
			start(controller) {
				controller.enqueue(encoder.encode("redirect body"));
			},
		});
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(redirectBody, {
					status: 302,
					headers: { location: "/next" },
				}),
			)
			.mockResolvedValueOnce(htmlResponse(["<title>Redirected</title>"]));
		vi.stubGlobal("fetch", fetchMock);

		await fetchUrl("https://example.com/start");

		expect(canceled).toBe(true);
	});

	it("blocks redirects to private network targets", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(null, {
						status: 302,
						headers: { location: "http://127.0.0.1/admin" },
					}),
			),
		);

		await expect(fetchUrl("https://example.com/start")).rejects.toThrow(
			"private/internal",
		);
	});

	it("cancels blocked redirect response bodies before throwing", async () => {
		let canceled = false;
		const redirectBody = new ReadableStream<Uint8Array>({
			cancel() {
				canceled = true;
			},
			start(controller) {
				controller.enqueue(encoder.encode("blocked redirect body"));
			},
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(redirectBody, {
						status: 302,
						headers: { location: "http://127.0.0.1/admin" },
					}),
			),
		);

		await expect(fetchUrl("https://example.com/start")).rejects.toThrow(
			"private/internal",
		);
		expect(canceled).toBe(true);
	});

	it("returns a manual redirect response when followRedirects is false", async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(null, {
					status: 302,
					headers: { location: "https://example.com/next" },
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await fetchUrl("https://example.com/start", {
			followRedirects: false,
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.finalUrl).toBe("https://example.com/start");
		expect(result.statusCode).toBe(302);
	});

	it("throws when the redirect chain exceeds the redirect limit", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(null, {
						status: 302,
						headers: { location: "/again" },
					}),
			),
		);

		await expect(fetchUrl("https://example.com/start")).rejects.toThrow(
			"Too many redirects",
		);
	});

	it("throws a typed TIMEOUT error after the configured timeout", async () => {
		vi.useFakeTimers();
		const fetchMock = vi.fn(
			(_url: string, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener(
						"abort",
						() => reject(new DOMException("Aborted", "AbortError")),
						{ once: true },
					);
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = fetchUrl("https://example.com/start", { timeout: 10 });
		const assertion = result.catch((err: unknown) => {
			expect(err).toBeInstanceOf(LinkpeekError);
			expect((err as LinkpeekError).code).toBe("TIMEOUT");
		});
		await vi.advanceTimersByTimeAsync(10);

		await assertion;
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("rethrows a caller abort without wrapping it as a timeout", async () => {
		const fetchMock = vi.fn(
			(_url: string, init?: RequestInit) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener(
						"abort",
						() => reject(new DOMException("Aborted", "AbortError")),
						{ once: true },
					);
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const controller = new AbortController();
		const result = fetchUrl("https://example.com/start", {
			signal: controller.signal,
		});
		controller.abort();

		await expect(result).rejects.toThrow("Aborted");
		await expect(result).rejects.not.toBeInstanceOf(LinkpeekError);
	});

	it("rejects immediately when the caller signal is already aborted", async () => {
		const fetchMock = vi.fn(async () => htmlResponse(["<title>ok</title>"]));
		vi.stubGlobal("fetch", fetchMock);

		const controller = new AbortController();
		controller.abort();

		await expect(
			fetchUrl("https://example.com", { signal: controller.signal }),
		).rejects.toThrow();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("uses a caller-provided fetch implementation", async () => {
		const globalFetchMock = vi.fn(async () =>
			htmlResponse(["<title>g</title>"]),
		);
		vi.stubGlobal("fetch", globalFetchMock);
		const customFetch = vi.fn(async () =>
			htmlResponse(["<title>Custom</title>"]),
		);

		const result = await fetchUrl("https://example.com", {
			fetch: customFetch as unknown as typeof globalThis.fetch,
		});

		expect(customFetch).toHaveBeenCalledTimes(1);
		expect(globalFetchMock).not.toHaveBeenCalled();
		expect(result.html).toBe("<title>Custom</title>");
	});

	it("respects a custom maxRedirects limit", async () => {
		const fetchMock = vi.fn(
			async () =>
				new Response(null, {
					status: 302,
					headers: { location: "/again" },
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			fetchUrl("https://example.com/start", { maxRedirects: 2 }),
		).rejects.toThrow("Too many redirects");
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("cancels the response body before throwing on too many redirects", async () => {
		let cancelCount = 0;
		let bodyCount = 0;
		const fetchMock = vi.fn(async () => {
			bodyCount++;
			const body = new ReadableStream<Uint8Array>({
				cancel() {
					cancelCount++;
				},
				start(controller) {
					controller.enqueue(encoder.encode("redirect body"));
				},
			});
			return new Response(body, {
				status: 302,
				headers: { location: "/again" },
			});
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(fetchUrl("https://example.com/start")).rejects.toThrow(
			"Too many redirects",
		);
		expect(cancelCount).toBe(bodyCount);
	});

	it("cancels non-HTML response bodies", async () => {
		let canceled = false;
		const body = new ReadableStream<Uint8Array>({
			cancel() {
				canceled = true;
			},
			start(controller) {
				controller.enqueue(encoder.encode('{"a":1}'));
			},
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(body, {
						status: 200,
						headers: { "content-type": "application/json" },
					}),
			),
		);

		const result = await fetchUrl("https://example.com/data.json");

		expect(result.isHtml).toBe(false);
		expect(canceled).toBe(true);
	});

	it("overrides default headers case-insensitively instead of merging", async () => {
		const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
			htmlResponse(["<title>ok</title>"]),
		);
		vi.stubGlobal("fetch", fetchMock);

		await fetchUrl("https://example.com", {
			headers: { "user-agent": "MyBot/1.0" },
		});

		const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
			string,
			string
		>;
		const userAgentKeys = Object.keys(headers).filter(
			(key) => key.toLowerCase() === "user-agent",
		);
		expect(userAgentKeys).toHaveLength(1);
		expect(headers[userAgentKeys[0]]).toBe("MyBot/1.0");
	});

	it("drops custom headers on cross-origin redirects but keeps defaults", async () => {
		const fetchMock = vi
			.fn<(url: string, init?: RequestInit) => Promise<Response>>()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { location: "https://other.example.org/page" },
				}),
			)
			.mockResolvedValueOnce(htmlResponse(["<title>Other</title>"]));
		vi.stubGlobal("fetch", fetchMock);

		await fetchUrl("https://example.com/start", {
			headers: { "X-Preview-Locale": "en-US" },
		});

		const firstHeaders = fetchMock.mock.calls[0]?.[1]?.headers as Record<
			string,
			string
		>;
		const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<
			string,
			string
		>;
		expect(firstHeaders["X-Preview-Locale"]).toBe("en-US");
		expect(secondHeaders["X-Preview-Locale"]).toBeUndefined();
		expect(secondHeaders["User-Agent"]).toBeTruthy();
	});

	it("keeps custom headers on same-origin redirects", async () => {
		const fetchMock = vi
			.fn<(url: string, init?: RequestInit) => Promise<Response>>()
			.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { location: "/next" },
				}),
			)
			.mockResolvedValueOnce(htmlResponse(["<title>Next</title>"]));
		vi.stubGlobal("fetch", fetchMock);

		await fetchUrl("https://example.com/start", {
			headers: { "X-Preview-Locale": "en-US" },
		});

		const secondHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<
			string,
			string
		>;
		expect(secondHeaders["X-Preview-Locale"]).toBe("en-US");
	});
});

describe("charset detection", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function bytesResponse(bytes: Uint8Array, contentType: string): Response {
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(bytes);
				controller.close();
			},
		});
		return new Response(stream, {
			headers: { "content-type": contentType },
		});
	}

	function concatBytes(...parts: Uint8Array[]): Uint8Array {
		const total = parts.reduce((sum, part) => sum + part.length, 0);
		const combined = new Uint8Array(total);
		let offset = 0;
		for (const part of parts) {
			combined.set(part, offset);
			offset += part.length;
		}
		return combined;
	}

	// "Привет" in windows-1251
	const cyrillicCp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]);

	it("reads charset from a meta tag when the header has none", async () => {
		const bytes = concatBytes(
			encoder.encode('<html><head><meta charset="windows-1251"><title>'),
			cyrillicCp1251,
			encoder.encode("</title></head></html>"),
		);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => bytesResponse(bytes, "text/html")),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("Привет");
	});

	it("reads charset from http-equiv content-type meta tags", async () => {
		const bytes = concatBytes(
			encoder.encode(
				'<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1251"><title>',
			),
			cyrillicCp1251,
			encoder.encode("</title></head></html>"),
		);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => bytesResponse(bytes, "text/html")),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("Привет");
	});

	it("prefers the Content-Type header charset over meta tags", async () => {
		const bytes = concatBytes(
			encoder.encode('<html><head><meta charset="utf-8"><title>'),
			cyrillicCp1251,
			encoder.encode("</title></head></html>"),
		);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				bytesResponse(bytes, "text/html; charset=windows-1251"),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("Привет");
	});

	it("detects UTF-16LE from a byte order mark", async () => {
		const utf16 = Buffer.from("<html><head><title>Hi</title>", "utf16le");
		const bytes = concatBytes(
			new Uint8Array([0xff, 0xfe]),
			new Uint8Array(utf16),
		);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => bytesResponse(bytes, "text/html")),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("<title>Hi</title>");
	});
});
