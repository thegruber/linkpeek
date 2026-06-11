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

	it("throws on invalid URL", async () => {
		await expect(preview("not-a-valid-url")).rejects.toThrow();
	});

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
