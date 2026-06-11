// Smoke test: verifies linkpeek dist output loads and works under the Bun
// runtime itself (not Node via shebang). Run after `npm run build`:
//   bun test/bun-smoke.ts
import {
	LinkpeekError,
	parseHTML,
	presets,
	validateUrl,
} from "../dist/index.js";

if (!("Bun" in globalThis)) {
	throw new Error("bun-smoke must run under the Bun runtime");
}

const result = parseHTML(
	'<html><head><title>Test</title><meta property="og:title" content="OG Title"></head></html>',
	"https://example.com",
);

if (result.title !== "OG Title") {
	throw new Error(`Expected "OG Title", got: ${result.title}`);
}
if (result.siteName !== "example.com") {
	throw new Error(`Expected "example.com", got: ${result.siteName}`);
}
if (presets.quality.includeBodyContent !== true) {
	throw new Error("presets.quality should enable includeBodyContent");
}

try {
	validateUrl("http://169.254.169.254/latest/meta-data/");
	throw new Error("validateUrl should block link-local metadata IPs");
} catch (err) {
	if (
		!(err instanceof LinkpeekError) ||
		err.code !== "PRIVATE_NETWORK_BLOCKED"
	) {
		throw err;
	}
}

console.log("Bun smoke test passed");
