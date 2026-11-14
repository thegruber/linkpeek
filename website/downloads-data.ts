// Pure helpers for the homepage download chart, kept DOM-free so they can be
// unit tested without a browser.

export interface DailyDownloads {
	day: string;
	downloads: number;
}

export interface WeeklyDownloads {
	start: string;
	end: string;
	downloads: number;
}

export interface DownloadSummary {
	last7Days: number;
	previous7Days: number;
	last30Days: number;
	total: number;
	through: string;
	weeks: WeeklyDownloads[];
}

export function downloadsEndpoint(packageName: string): string {
	return `https://api.npmjs.org/downloads/range/last-year/${encodeURIComponent(packageName)}`;
}

export function parseDownloads(payload: unknown): DailyDownloads[] {
	const entries = (payload as { downloads?: unknown })?.downloads;
	if (!Array.isArray(entries) || entries.length < 14) {
		throw new Error("npm download API returned an unexpected payload");
	}
	return entries
		.map((entry) => ({
			day: String(entry?.day ?? ""),
			downloads: Number(entry?.downloads),
		}))
		.filter(
			(entry) =>
				/^\d{4}-\d{2}-\d{2}$/.test(entry.day) &&
				Number.isFinite(entry.downloads) &&
				entry.downloads >= 0,
		)
		.sort((a, b) => a.day.localeCompare(b.day));
}

// Buckets end on the latest complete day so the most recent week is always a
// full seven days; a partial leading bucket and leading zero weeks (before the
// first publish) are dropped.
export function summarizeDownloads(daily: DailyDownloads[]): DownloadSummary {
	const weeks: WeeklyDownloads[] = [];
	for (let end = daily.length; end - 7 >= 0; end -= 7) {
		const slice = daily.slice(end - 7, end);
		weeks.unshift({
			start: slice[0].day,
			end: slice[6].day,
			downloads: sum(slice),
		});
	}
	const firstActive = weeks.findIndex((week) => week.downloads > 0);
	return {
		last7Days: sum(daily.slice(-7)),
		previous7Days: sum(daily.slice(-14, -7)),
		last30Days: sum(daily.slice(-30)),
		total: sum(daily),
		through: daily.at(-1)?.day ?? "",
		weeks: firstActive === -1 ? [] : weeks.slice(firstActive),
	};
}

// Rounds an axis maximum up to a readable step times a power of ten.
export function niceMaximum(value: number): number {
	if (value <= 0) return 1;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const step =
		[1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((n) => n * magnitude >= value) ??
		10;
	return step * magnitude;
}

function sum(entries: DailyDownloads[]): number {
	return entries.reduce((total, entry) => total + entry.downloads, 0);
}
