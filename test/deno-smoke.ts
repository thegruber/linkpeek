// Smoke test: verifies linkpeek dist output loads and works in Deno.
// Run after `npm run build`: deno run test/deno-smoke.ts
import { parseHTML } from "../dist/index.js";

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

console.log("Deno smoke test passed");
