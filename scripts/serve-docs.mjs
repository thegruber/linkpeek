#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "website/dist");
const docsBase = normalizeBase(process.env.LINKPEEK_DOCS_BASE || "/linkpeek/");
const hostname = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const contentTypes = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".txt": "text/plain; charset=utf-8",
	".woff2": "font/woff2",
	".xml": "application/xml; charset=utf-8",
};

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
	throw new Error("PORT must be an integer from 1 to 65535");
}
if (!existsSync(outputDir)) {
	throw new Error(
		"Documentation output is missing. Run npm run docs:build first.",
	);
}

const server = createServer((request, response) => {
	const requestUrl = new URL(request.url || "/", `http://${hostname}:${port}`);
	if (
		requestUrl.pathname === "/" ||
		requestUrl.pathname === docsBase.slice(0, -1)
	) {
		response.writeHead(302, { location: docsBase });
		response.end();
		return;
	}

	let pathname;
	try {
		pathname = decodeURIComponent(requestUrl.pathname);
	} catch {
		serveError(response, 400, "Invalid URL encoding");
		return;
	}
	if (!pathname.startsWith(docsBase)) {
		serveError(response, 404, "Not found");
		return;
	}

	const relativePath = pathname.slice(docsBase.length);
	let filePath = resolve(outputDir, relativePath || "index.html");
	if (filePath !== outputDir && !filePath.startsWith(`${outputDir}${sep}`)) {
		serveError(response, 404, "Not found");
		return;
	}
	if (existsSync(filePath) && statSync(filePath).isDirectory()) {
		filePath = resolve(filePath, "index.html");
	}
	if (!existsSync(filePath) || !statSync(filePath).isFile()) {
		filePath = resolve(outputDir, "404.html");
		response.statusCode = 404;
	}

	response.setHeader(
		"content-type",
		contentTypes[extname(filePath)] || "application/octet-stream",
	);
	response.setHeader("cache-control", "no-store");
	response.setHeader("x-content-type-options", "nosniff");
	if (request.method === "HEAD") {
		response.end();
		return;
	}
	createReadStream(filePath).pipe(response);
});

server.listen(port, hostname, () => {
	console.log(`linkpeek docs preview: http://${hostname}:${port}${docsBase}`);
});

function normalizeBase(value) {
	const path = value.replace(/^\/+|\/+$/g, "");
	return path ? `/${path}/` : "/";
}

function serveError(response, status, message) {
	response.writeHead(status, {
		"cache-control": "no-store",
		"content-type": "text/plain; charset=utf-8",
		"x-content-type-options": "nosniff",
	});
	response.end(message);
}
