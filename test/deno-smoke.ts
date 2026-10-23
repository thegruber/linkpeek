// Smoke test: verifies linkpeek dist output loads and works in Deno.
// Run from a packed consumer with npm dependencies installed (see CI).
import { parseHTML, preview } from "npm:linkpeek";
import { runPreviewSmoke } from "./runtime-smoke.ts";

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

await runPreviewSmoke(preview);
console.log("Deno npm consumer smoke test passed");
