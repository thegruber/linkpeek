import { afterEach, describe, expect, it, vi } from "vitest";
import { preview } from "../src/index.js";

const liveTestsEnabled = process.env.LINKPEEK_LIVE_TESTS === "1";

describe.skipIf(!liveTestsEnabled)("preview() live URLs", () => {
	it("fetches a live URL and returns metadata", {
		timeout: 15000,
	}, async () => {
		const result = await preview("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
		expect(result.url).toBeTruthy();
		expect(result.title).toBeTruthy();
		expect(result.siteName).toBeTruthy();
		expect(result.image).toBeTruthy();
		expect(result.statusCode).toBe(200);
	});

	it("returns image field for a direct image URL", {
		timeout: 15000,
	}, async () => {
		const imageUrl =
			"https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png";
		const result = await preview(imageUrl);
		expect(result.image).toBe(imageUrl);
		expect(result.title).toBeNull();
		expect(result.statusCode).toBe(200);
	});
});

describe("preview()", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("stops reading the response after the head in fast mode", async () => {
		const encoder = new TextEncoder();
		const page = encoder.encode(
			`<html><head><title>Early title</title></head><body>${"x".repeat(50_000)}</body></html>`,
		);
		let emittedBytes = 0;
		let canceled = false;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				if (emittedBytes >= page.length) {
					controller.close();
					return;
				}
				const end = Math.min(emittedBytes + 512, page.length);
				controller.enqueue(page.slice(emittedBytes, end));
				emittedBytes = end;
			},
			cancel() {
				canceled = true;
			},
		});
		const fetchMock = vi.fn(
			async () =>
				new Response(body, {
					headers: { "content-type": "text/html; charset=utf-8" },
				}),
		);

		const result = await preview("https://example.com/article", {
			fetch: fetchMock,
			maxBytes: 30_000,
		});

		expect(result.title).toBe("Early title");
		expect(canceled).toBe(true);
		expect(emittedBytes).toBeLessThan(30_000);
	});

	it.each([false, true])(
		"ignores nested template metadata and refreshes (body scan=%s)",
		async (includeBodyContent) => {
			const chunks = [
				'<head><template><meta property="og:title" content="Inert"><meta http-equiv="refresh" content="0; url=/wrong"><template><div>Inert body</div></template></template>',
				'<title>Real title</title></head><body><template><img src="/inert.jpg"><script type="application/ld+json">{"name":"Inert JSON"}</script></template><img src="/real.jpg"></body>',
			];
			const fetchMock = vi.fn(
				async () =>
					new Response(
						new ReadableStream<Uint8Array>({
							pull(controller) {
								const chunk = chunks.shift();
								if (chunk) controller.enqueue(new TextEncoder().encode(chunk));
								else controller.close();
							},
						}),
						{ headers: { "content-type": "text/html" } },
					),
			);
			const result = await preview("https://example.com", {
				fetch: fetchMock,
				includeBodyContent,
				followMetaRefresh: true,
			});
			expect(result.title).toBe("Real title");
			expect(result.image).toBe(
				includeBodyContent ? "https://example.com/real.jpg" : null,
			);
			expect(fetchMock).toHaveBeenCalledTimes(1);
		},
	);

	it("continues reading body metadata when body scanning is enabled", async () => {
		const page = `<html><head><title>Head fallback</title></head><body>
			${"padding ".repeat(300)}
			<script type="application/ld+json">
				{"headline":"Body JSON-LD title"}
			</script>
		</body></html>`;
		const fetchMock = vi.fn(
			async () =>
				new Response(page, {
					headers: { "content-type": "text/html; charset=utf-8" },
				}),
		);

		const result = await preview("https://example.com/article", {
			fetch: fetchMock,
			includeBodyContent: true,
			maxBytes: 10_000,
		});

		expect(result.title).toBe("Body JSON-LD title");
	});

	it("streams through a body image fallback when body scanning is enabled", async () => {
		const encoder = new TextEncoder();
		const page = encoder.encode(
			`<html><head><title>Body image</title></head><body>${"padding ".repeat(300)}<img src="/fallback.jpg"></body></html>`,
		);
		let emittedBytes = 0;
		let canceled = false;
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				if (emittedBytes >= page.length) {
					controller.close();
					return;
				}
				const end = Math.min(emittedBytes + 256, page.length);
				controller.enqueue(page.slice(emittedBytes, end));
				emittedBytes = end;
			},
			cancel() {
				canceled = true;
			},
		});
		const fetchMock = vi.fn(
			async () =>
				new Response(body, {
					headers: { "content-type": "text/html; charset=utf-8" },
				}),
		);

		const result = await preview("https://example.com/article", {
			fetch: fetchMock,
			includeBodyContent: true,
			maxBytes: 10_000,
		});

		expect(result.image).toBe("https://example.com/fallback.jpg");
		expect(emittedBytes).toBe(page.length);
		expect(canceled).toBe(false);
	});

	it("does not make body meta refresh behavior depend on response chunking", async () => {
		const head = "<html><head><title>Article</title></head><body>";
		const bodyRefresh =
			'<meta http-equiv="refresh" content="0; url=https://example.com/unexpected">';
		const encoder = new TextEncoder();
		const chunks = [encoder.encode(head), encoder.encode(bodyRefresh)];
		const body = new ReadableStream<Uint8Array>({
			pull(controller) {
				const next = chunks.shift();
				if (next) controller.enqueue(next);
				else controller.close();
			},
		});
		const fetchMock = vi.fn(
			async () =>
				new Response(body, {
					headers: { "content-type": "text/html; charset=utf-8" },
				}),
		);

		const result = await preview("https://example.com/article", {
			fetch: fetchMock,
			followMetaRefresh: true,
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.title).toBe("Article");
	});

	it("throws on invalid URL", async () => {
		await expect(preview("not-a-valid-url")).rejects.toThrow();
	});

	it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 1.5])(
		"rejects an invalid maxRedirects value (%s) before fetching",
		async (maxRedirects) => {
			const fetchMock = vi.fn();
			vi.stubGlobal("fetch", fetchMock);

			await expect(
				preview("https://example.com", { maxRedirects }),
			).rejects.toMatchObject({
				code: "INVALID_OPTIONS",
			});
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);

	it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 2_147_483_648])(
		"rejects an invalid timeout value (%s) before fetching",
		async (timeout) => {
			const fetchMock = vi.fn();
			vi.stubGlobal("fetch", fetchMock);

			await expect(
				preview("https://example.com", { timeout }),
			).rejects.toMatchObject({
				code: "INVALID_OPTIONS",
			});
			expect(fetchMock).not.toHaveBeenCalled();
		},
	);

	it("detects direct media content types case-insensitively", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(null, {
						status: 200,
						headers: { "content-type": "Image/PNG" },
					}),
			),
		);

		const result = await preview("https://example.com/image.png");

		expect(result.image).toBe("https://example.com/image.png");
		expect(result.mediaType).toBe("image");
	});

	it("follows meta-refresh interstitials even when they have a title", async () => {
		const interstitial = `<html><head>
			<title>Just a moment...</title>
			<meta http-equiv="refresh" content="0; url=https://example.com/real">
		</head></html>`;
		const destination = `<html><head>
			<title>Real Title</title>
		</head></html>`;
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(interstitial, {
					status: 200,
					headers: { "content-type": "text/html" },
				}),
			)
			.mockResolvedValueOnce(
				new Response(destination, {
					status: 200,
					headers: { "content-type": "text/html" },
				}),
			);
		vi.stubGlobal("fetch", fetchMock);

		const result = await preview("https://example.com/start", {
			followMetaRefresh: true,
		});

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(result.title).toBe("Real Title");
		expect(result.url).toBe("https://example.com/real");
	});

	it.each([
		{
			httpRedirect: false,
			target: "https://other.example/real",
			expected: null,
		},
		{
			httpRedirect: true,
			target: "https://other.example/real",
			expected: null,
		},
		{
			httpRedirect: false,
			target: "https://example.com/real",
			expected: "site-value",
		},
	])(
		"keeps custom headers on the original origin across meta refresh ($httpRedirect, $target)",
		async ({ httpRedirect, target, expected }) => {
			const seen: (string | null)[] = [];
			const fetchMock = vi.fn(
				async (input: string | URL | Request, init?: RequestInit) => {
					seen.push(new Headers(init?.headers).get("X-Site-Header"));
					if (httpRedirect && seen.length === 1)
						return new Response(null, {
							status: 302,
							headers: { location: "https://other.example/interstitial" },
						});
					return new Response(
						String(input) === target
							? "<head><title>Destination</title></head>"
							: `<head><meta http-equiv="refresh" content="0; url=${target}"></head>`,
						{ headers: { "content-type": "text/html" } },
					);
				},
			);
			const result = await preview("https://example.com/start", {
				fetch: fetchMock,
				followMetaRefresh: true,
				headers: { "X-Site-Header": "site-value" },
			});
			expect(result.title).toBe("Destination");
			expect(seen[0]).toBe("site-value");
			expect(seen.slice(1)).toEqual(
				httpRedirect ? [null, expected] : [expected],
			);
		},
	);

	it("rethrows caller aborts during a meta-refresh request", async () => {
		const interstitial = `<html><head>
			<meta http-equiv="refresh" content="0; url=https://example.com/real">
		</head></html>`;
		const controller = new AbortController();
		const abortReason = new DOMException(
			"Caller stopped preview",
			"AbortError",
		);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(interstitial, {
					status: 200,
					headers: { "content-type": "text/html" },
				}),
			)
			.mockImplementationOnce(async (_url: string, init?: RequestInit) => {
				controller.abort(abortReason);
				throw init?.signal?.reason;
			});
		vi.stubGlobal("fetch", fetchMock);

		const result = preview("https://example.com/start", {
			followMetaRefresh: true,
			signal: controller.signal,
		});

		await expect(result).rejects.toBe(abortReason);
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("does not refetch slow meta refreshes", async () => {
		const page = `<html><head>
			<title>Liveblog</title>
			<meta http-equiv="refresh" content="60; url=https://example.com/reload">
		</head></html>`;
		const fetchMock = vi.fn(
			async () =>
				new Response(page, {
					status: 200,
					headers: { "content-type": "text/html" },
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		const result = await preview("https://example.com/start", {
			followMetaRefresh: true,
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(result.title).toBe("Liveblog");
	});

	it("returns the HTTP status code for non-2xx HTML responses", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response("<html><head><title>Not Found</title></head></html>", {
						status: 404,
						headers: { "content-type": "text/html" },
					}),
			),
		);

		const result = await preview("https://example.com/missing");

		expect(result.statusCode).toBe(404);
		expect(result.title).toBe("Not Found");
	});
});
