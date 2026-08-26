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

function chunkedBytesResponse(
	chunks: Uint8Array[],
	contentType = "text/html",
	onCancel?: () => void | Promise<void>,
): Response {
	const queue = [...chunks];
	const stream = new ReadableStream<Uint8Array>({
		cancel() {
			return onCancel?.();
		},
		pull(controller) {
			const chunk = queue.shift();
			if (chunk) controller.enqueue(chunk);
			else controller.close();
		},
	});

	return new Response(stream, {
		headers: { "content-type": contentType },
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

	it("retains no response bytes when maxBytes is zero", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => htmlResponse(["a first chunk larger than the limit"])),
		);

		const result = await fetchUrl("https://example.com", { maxBytes: 0 });

		expect(result.html).toBe("");
	});

	it("retains a positive response smaller than a sub-kilobyte limit", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => htmlResponse(["small response"])),
		);

		const result = await fetchUrl("https://example.com", { maxBytes: 100 });

		expect(result.html).toBe("small response");
	});

	it("retains exactly maxBytes when the stream lands on the boundary", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => htmlResponse(["abc", "de", "ignored"])),
		);

		const result = await fetchUrl("https://example.com", { maxBytes: 5 });

		expect(result.html).toBe("abcde");
	});

	it("slices an oversized first chunk to maxBytes", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => htmlResponse(["first chunk is oversized"])),
		);

		const result = await fetchUrl("https://example.com", { maxBytes: 5 });

		expect(result.html).toBe("first");
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

	it("rethrows a caller abort while awaiting the response body", async () => {
		let enteredPendingRead = () => {};
		const pendingRead = new Promise<void>((resolve) => {
			enteredPendingRead = resolve;
		});
		let pullCount = 0;
		const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
			const body = new ReadableStream<Uint8Array>({
				start(controller) {
					init?.signal?.addEventListener(
						"abort",
						() =>
							controller.error(
								init.signal?.reason ??
									new DOMException("Aborted", "AbortError"),
							),
						{ once: true },
					);
				},
				pull(controller) {
					pullCount++;
					if (pullCount === 1) {
						controller.enqueue(encoder.encode("<html><head><title>Partial"));
						return;
					}
					enteredPendingRead();
					return new Promise<void>(() => {});
				},
			});
			return Promise.resolve(
				new Response(body, {
					headers: { "content-type": "text/html; charset=utf-8" },
				}),
			);
		});
		vi.stubGlobal("fetch", fetchMock);

		const controller = new AbortController();
		const result = fetchUrl("https://example.com/start", {
			signal: controller.signal,
		});
		await pendingRead;
		controller.abort(new DOMException("Caller stopped", "AbortError"));

		await expect(result).rejects.toThrow("Caller stopped");
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

describe("early head cancellation", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("preserves a headerless legacy charset after the 1024-byte prescan", async () => {
		const asciiPrefix = encoder.encode(
			`<html><head><meta charset="windows-1251"><style>${"x".repeat(1_100)}</style><title>`,
		);
		const cyrillic = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2]);
		const suffix = encoder.encode(
			`</title></head><body>${"unused".repeat(4_000)}</body></html>`,
		);
		const bytes = new Uint8Array(
			asciiPrefix.length + cyrillic.length + suffix.length,
		);
		bytes.set(asciiPrefix);
		bytes.set(cyrillic, asciiPrefix.length);
		bytes.set(suffix, asciiPrefix.length + cyrillic.length);
		const chunks = Array.from(
			{ length: Math.ceil(bytes.length / 127) },
			(_, index) => bytes.slice(index * 127, (index + 1) * 127),
		);
		let canceled = false;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				chunkedBytesResponse(chunks, "text/html", () => {
					canceled = true;
				}),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("<title>Привет</title>");
		expect(canceled).toBe(true);
		expect(result.html.length).toBeLessThan(2_000);
	});

	it("handles a UTF-16 BOM and odd stream chunk boundaries", async () => {
		const page = `<html><head><style>${"x".repeat(600)}</style><title>Žluťoučký</title></head><body>${"unused".repeat(2_000)}</body></html>`;
		const encoded = Buffer.from(page, "utf16le");
		const bytes = new Uint8Array(encoded.length + 2);
		bytes.set([0xff, 0xfe]);
		bytes.set(encoded, 2);
		const chunks = Array.from(
			{ length: Math.ceil(bytes.length / 3) },
			(_, index) => bytes.slice(index * 3, (index + 1) * 3),
		);
		let canceled = false;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				chunkedBytesResponse(chunks, "text/html", () => {
					canceled = true;
				}),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("<title>Žluťoučký</title>");
		expect(canceled).toBe(true);
		expect(result.html).not.toContain("unusedunused");
	});

	it("detects a UTF-16BE BOM before early cancellation", async () => {
		const page = `<html><head><style>${"x".repeat(600)}</style><title>BE title</title></head><body>${"unused".repeat(2_000)}</body></html>`;
		const littleEndian = Buffer.from(page, "utf16le");
		const bytes = new Uint8Array(littleEndian.length + 2);
		bytes.set([0xfe, 0xff]);
		for (let index = 0; index < littleEndian.length; index += 2) {
			bytes[index + 2] = littleEndian[index + 1];
			bytes[index + 3] = littleEndian[index];
		}
		const chunks = Array.from(
			{ length: Math.ceil(bytes.length / 5) },
			(_, index) => bytes.slice(index * 5, (index + 1) * 5),
		);
		let canceled = false;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				chunkedBytesResponse(chunks, "text/html", () => {
					canceled = true;
				}),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("<title>BE title</title>");
		expect(canceled).toBe(true);
		expect(result.html).not.toContain("unusedunused");
	});

	it("preserves UTF-8 characters split across chunks", async () => {
		const euro = encoder.encode("€");
		let canceled = false;
		const chunks = [
			encoder.encode("<html><head><title>Price "),
			euro.slice(0, 1),
			euro.slice(1),
			encoder.encode("10</title></head>"),
			encoder.encode(`<body>${"unused".repeat(1_000)}</body>`),
		];
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				chunkedBytesResponse(chunks, "text/html; charset=utf-8", () => {
					canceled = true;
				}),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("<title>Price €10</title>");
		expect(canceled).toBe(true);
		expect(result.html).not.toContain("unused");
	});

	it("ignores a literal closing-head string in script and detects a split tag", async () => {
		let canceled = false;
		const chunks = [
			encoder.encode('<html><head><script>const marker = "</head>";</script>'),
			encoder.encode("<title>Still in head</title></he"),
			encoder.encode("ad>"),
			encoder.encode(`<body>${"unused".repeat(1_000)}</body>`),
		];
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				chunkedBytesResponse(chunks, "text/html; charset=utf-8", () => {
					canceled = true;
				}),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("<title>Still in head</title>");
		expect(canceled).toBe(true);
		expect(result.html).not.toContain("unused");
	});

	it("stops on an implicit body and tolerates a rejected cancel", async () => {
		const chunks = [
			encoder.encode("<html><head><title>Implicit</title>"),
			encoder.encode("<main>Body starts"),
			encoder.encode(`${"unused".repeat(1_000)}</main>`),
		];
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				chunkedBytesResponse(chunks, "text/html; charset=utf-8", async () => {
					throw new Error("transport already closed");
				}),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toContain("<title>Implicit</title>");
		expect(result.html).toContain("<main>Body starts");
		expect(result.html).not.toContain("unused");
	});

	it("returns an unterminated head at EOF", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				chunkedBytesResponse(
					[encoder.encode("<html><head><title>EOF title</title>")],
					"text/html; charset=utf-8",
				),
			),
		);

		const result = await fetchUrl("https://example.com");

		expect(result.html).toBe("<html><head><title>EOF title</title>");
	});
});
