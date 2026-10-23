import { afterEach, expect, it, vi } from "vitest";
import playground from "../examples/playground/index.js";

afterEach(() => vi.useRealTimers());

it("bounds demo rate-limit capacity and reclaims expired clients", async () => {
	vi.useFakeTimers();
	vi.setSystemTime(new Date("2026-10-23T00:00:00Z"));
	const request = (ip: string) =>
		playground.fetch(
			new Request("https://demo.example/api/preview", {
				headers: { "cf-connecting-ip": ip },
			}),
		);
	for (let index = 0; index < 1000; index++) {
		expect((await request(`client-${index}`)).status).toBe(400);
	}
	expect((await request("new-client")).status).toBe(429);
	vi.advanceTimersByTime(60_000);
	expect((await request("new-client")).status).toBe(400);
	for (let index = 1; index < 20; index++) await request("new-client");
	expect((await request("new-client")).status).toBe(429);
});
