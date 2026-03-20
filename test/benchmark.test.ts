import { describe, expect, it } from "vitest";
import { preview } from "../src/index.js";

const TIMEOUT = 20_000;

describe.skipIf(!!process.env.CI)("live URL extraction quality", () => {
	it(
		"YouTube video",
		async () => {
			const result = await preview(
				"https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			);
			expect(result.title).toBeTruthy();
			expect(result.image).toBeTruthy();
			expect(result.siteName).toContain("YouTube");
		},
		TIMEOUT,
	);

	it(
		"GitHub repository",
		async () => {
			const result = await preview("https://github.com/fb55/htmlparser2");
			expect(result.title).toBeTruthy();
			expect(result.description).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Wikipedia article",
		async () => {
			const result = await preview(
				"https://en.wikipedia.org/wiki/Web_scraping",
			);
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"BBC News",
		async () => {
			const result = await preview("https://www.bbc.com/news");
			expect(result.title).toBeTruthy();
			expect(result.siteName).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Stack Overflow question",
		async () => {
			const result = await preview(
				"https://stackoverflow.com/questions/10049557/reading-all-files-in-a-directory",
			);
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Medium article",
		async () => {
			const result = await preview("https://medium.com/about");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Reddit",
		async () => {
			const result = await preview("https://www.reddit.com");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"NYTimes",
		async () => {
			const result = await preview("https://www.nytimes.com");
			expect(result.title).toBeTruthy();
			expect(result.siteName).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"CNN",
		async () => {
			const result = await preview("https://www.cnn.com");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Twitter/X profile",
		async () => {
			const result = await preview("https://x.com/veraborovets");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"LinkedIn",
		async () => {
			const result = await preview("https://www.linkedin.com");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Spotify",
		async () => {
			const result = await preview("https://open.spotify.com");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"IMDb",
		async () => {
			const result = await preview("https://www.imdb.com/title/tt0111161/");
			expect(result.title ?? result.siteName).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"example.com (simple)",
		async () => {
			const result = await preview("http://example.com");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"W3C (potential Dublin Core)",
		async () => {
			const result = await preview("https://www.w3.org");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Non-English site (Japan)",
		async () => {
			const result = await preview("https://www.yahoo.co.jp");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Vimeo video",
		async () => {
			const result = await preview("https://vimeo.com/1084537");
			expect(result.title).toBeTruthy();
			expect(result.image).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"Hacker News",
		async () => {
			const result = await preview("https://news.ycombinator.com");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);

	it(
		"NPM package page",
		async () => {
			const result = await preview("https://www.npmjs.com/package/htmlparser2");
			expect(result.title).toBeTruthy();
		},
		TIMEOUT,
	);
});
