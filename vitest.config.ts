import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		testTimeout: 15000,
		coverage: {
			thresholds: {
				statements: 90,
				branches: 85,
				functions: 90,
				lines: 95,
			},
		},
	},
});
