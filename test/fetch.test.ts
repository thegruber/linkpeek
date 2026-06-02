import { afterEach, describe, expect, it, vi } from "vitest";
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

	it("aborts an in-flight request after the configured timeout", async () => {
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
		const assertion = expect(result).rejects.toThrow("Aborted");
		await vi.advanceTimersByTimeAsync(10);

		await assertion;
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
