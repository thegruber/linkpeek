import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const esm = await import("../dist/index.js");
const cjs = require("../dist/index.cjs");

for (const [format, library] of [
	["ESM", esm],
	["CommonJS", cjs],
]) {
	assert.equal(
		typeof library.parseHTML,
		"function",
		`${format} parseHTML export`,
	);
	assert.equal(typeof library.preview, "function", `${format} preview export`);
	assert.equal(
		typeof library.validateUrl,
		"function",
		`${format} validateUrl export`,
	);

	const result = library.parseHTML(
		'<meta property="og:title" content="Packed output">',
		"https://example.com/",
	);
	assert.equal(result.title, "Packed output", `${format} parser behavior`);
}
