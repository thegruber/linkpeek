import { readFileSync } from "node:fs";
import { join } from "node:path";

// The repository's package version, read at build time on the server.
export const packageVersion: string = JSON.parse(
	readFileSync(join(process.cwd(), "..", "package.json"), "utf8"),
).version;
