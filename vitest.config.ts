import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	// Examples consume the package name; unit tests exercise current source.
	resolve: {
		alias: {
			linkpeek: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
		},
	},
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
