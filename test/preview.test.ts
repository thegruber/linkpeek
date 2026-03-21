import { describe, expect, it } from "vitest";
import { preview } from "../src/index.js";

describe("preview()", () => {
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

	it("throws on invalid URL", async () => {
		await expect(preview("not-a-valid-url")).rejects.toThrow();
	});
});
