import { readFileSync } from "node:fs";
import { createMDX } from "fumadocs-mdx/next";

const packageVersion = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
).version;

const base = (process.env.LINKPEEK_DOCS_BASE ?? "/linkpeek/").replace(
	/^\/+|\/+$/g,
	"",
);

/** @type {import('next').NextConfig} */
const config = {
	output: "export",
	basePath: base ? `/${base}` : "",
	trailingSlash: true,
	reactStrictMode: true,
	turbopack: { root: import.meta.dirname },
	images: { unoptimized: true },
	env: {
		NEXT_PUBLIC_BASE_PATH: base ? `/${base}` : "",
		NEXT_PUBLIC_LINKPEEK_VERSION: packageVersion,
	},
};

export default createMDX()(config);
