import { describe, expect, it } from "vitest";
import {
	downloadsEndpoint,
	parseDownloads,
	summarizeDownloads,
} from "../website/downloads-data.js";

function days(values: number[]) {
	const start = Date.UTC(2026, 0, 1);
	return values.map((downloads, index) => ({
		day: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
		downloads,
	}));
}

describe("homepage download sparkline data", () => {
	it("targets the public last-year endpoint", () => {
		expect(downloadsEndpoint("@scope/pkg")).toBe(
			"https://api.npmjs.org/downloads/range/last-year/%40scope%2Fpkg",
		);
	});

	it("rejects malformed payloads and drops invalid entries", () => {
		expect(() => parseDownloads({ error: "not found" })).toThrow();
		expect(() => parseDownloads(null)).toThrow();
		const parsed = parseDownloads({
			downloads: [
				...days(Array(14).fill(1)).reverse(),
				{ day: "bad", downloads: 5 },
				{ day: "2026-02-01", downloads: -1 },
			],
		});
		expect(parsed).toHaveLength(14);
		expect(parsed[0].day).toBe("2026-01-01");
	});

	it("buckets complete weeks ending on the latest day and trims pre-release weeks", () => {
		// 3 leftover days, 2 zero weeks, then 2 active weeks.
		const daily = days([
			9,
			9,
			9,
			...Array(14).fill(0),
			...Array(7).fill(1),
			...Array(7).fill(2),
		]);
		const summary = summarizeDownloads(daily);
		expect(summary.weeks).toEqual([
			{ start: "2026-01-18", end: "2026-01-24", downloads: 7 },
			{ start: "2026-01-25", end: "2026-01-31", downloads: 14 },
		]);
		expect(summary.last7Days).toBe(14);
		expect(summary.total).toBe(48);
		expect(summary.sinceLaunch).toBe(false);
	});

	it("labels the total as all-time only when the range predates the first download", () => {
		expect(
			summarizeDownloads(days([0, ...Array(14).fill(1)])).sinceLaunch,
		).toBe(true);
	});

	it("returns no weeks when nothing was downloaded", () => {
		expect(summarizeDownloads(days(Array(14).fill(0))).weeks).toEqual([]);
	});
});
