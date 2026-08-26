import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractMetaRefreshUrl, parseHTML } from "../src/parse.js";

const fixturesDir = resolve(import.meta.dirname, "fixtures");

function loadFixture(name: string): string {
	return readFileSync(resolve(fixturesDir, name), "utf-8");
}

const BASE = "https://example.com/test-page";

describe("parseHTML", () => {
	describe("og-standard.html", () => {
		const result = parseHTML(loadFixture("og-standard.html"), BASE);

		it("extracts og:title", () => {
			expect(result.title).toBe("The Open Graph Title");
		});

		it("extracts og:description", () => {
			expect(result.description).toBe(
				"A description for the open graph protocol.",
			);
		});

		it("extracts og:image", () => {
			expect(result.image).toBe("https://example.com/images/og-photo.jpg");
		});

		it("extracts og:site_name", () => {
			expect(result.siteName).toBe("Example Site");
		});

		it("extracts og:type as mediaType", () => {
			expect(result.mediaType).toBe("article");
		});

		it("uses og:url for canonicalUrl", () => {
			expect(result.canonicalUrl).toBe(
				"https://example.com/articles/og-standard",
			);
		});

		it("extracts og:locale", () => {
			expect(result.locale).toBe("en_US");
		});

		it("extracts lang from html element", () => {
			expect(result.lang).toBe("en");
		});
	});

	describe("twitter-card.html", () => {
		const result = parseHTML(loadFixture("twitter-card.html"), BASE);

		it("extracts twitter:card", () => {
			expect(result.twitterCard).toBe("summary_large_image");
		});

		it("extracts twitter:site", () => {
			expect(result.twitterSite).toBe("@examplesite");
		});

		it("extracts title from twitter:title", () => {
			expect(result.title).toBe("Twitter Card Title");
		});

		it("extracts description from twitter:description", () => {
			expect(result.description).toBe(
				"Description from twitter card meta tags.",
			);
		});

		it("extracts image from twitter:image", () => {
			expect(result.image).toBe(
				"https://example.com/images/twitter-banner.jpg",
			);
		});
	});

	describe("json-ld-article.html", () => {
		const result = parseHTML(loadFixture("json-ld-article.html"), BASE);

		it("extracts author from JSON-LD", () => {
			expect(result.author).toBe("Jane Doe");
		});

		it("extracts datePublished from JSON-LD", () => {
			expect(result.publishedDate).toBe("2025-06-15T08:00:00Z");
		});

		it("extracts image from JSON-LD ImageObject", () => {
			expect(result.image).toBe("https://example.com/images/json-ld-hero.jpg");
		});

		it("extracts title from JSON-LD headline", () => {
			expect(result.title).toBe("Understanding JSON-LD");
		});

		it("extracts description from JSON-LD", () => {
			expect(result.description).toBe(
				"A deep dive into structured data with JSON-LD.",
			);
		});

		it("extracts publisher as siteName from JSON-LD", () => {
			expect(result.siteName).toBe("Tech Journal");
		});
	});

	describe("json-ld-graph.html", () => {
		const result = parseHTML(loadFixture("json-ld-graph.html"), BASE);

		it("traverses @graph and extracts title from first item with name", () => {
			expect(result.title).toBe("Graph Site");
		});

		it("extracts description from BlogPosting in graph", () => {
			expect(result.description).toBe(
				"Description from the graph blog posting.",
			);
		});

		it("extracts image from BlogPosting in graph", () => {
			expect(result.image).toBe("https://example.com/images/graph-post.jpg");
		});

		it("extracts author from BlogPosting in graph", () => {
			expect(result.author).toBe("John Smith");
		});

		it("extracts datePublished from BlogPosting in graph", () => {
			expect(result.publishedDate).toBe("2025-09-01T12:00:00Z");
		});
	});

	describe("minimal.html", () => {
		const result = parseHTML(loadFixture("minimal.html"), BASE);

		it("extracts title from <title> tag", () => {
			expect(result.title).toBe("Minimal Page Title");
		});

		it("extracts description from meta description", () => {
			expect(result.description).toBe(
				"A simple page with only basic meta tags.",
			);
		});

		it("derives siteName from hostname", () => {
			expect(result.siteName).toBe("example.com");
		});

		it("defaults mediaType to website", () => {
			expect(result.mediaType).toBe("website");
		});

		it("has null for OG/Twitter-specific fields", () => {
			expect(result.twitterCard).toBeNull();
			expect(result.twitterSite).toBeNull();
			expect(result.locale).toBeNull();
			expect(result.video).toBeNull();
		});
	});

	describe("recipe-blog.html", () => {
		const result = parseHTML(loadFixture("recipe-blog.html"), BASE);

		it("extracts keywords from meta tag", () => {
			expect(result.keywords).toEqual([
				"cookies",
				"chocolate",
				"baking",
				"dessert",
				"recipe",
			]);
		});

		it("extracts first image from JSON-LD image array", () => {
			expect(result.image).toBe("https://example.com/images/cookies-wide.jpg");
		});

		it("extracts title from JSON-LD name", () => {
			expect(result.title).toBe("Best Chocolate Chip Cookies");
		});

		it("extracts author from JSON-LD", () => {
			expect(result.author).toBe("Baker Bob");
		});
	});

	describe("all-fields.html", () => {
		const result = parseHTML(loadFixture("all-fields.html"), BASE);

		it("has OG title (takes priority over twitter)", () => {
			expect(result.title).toBe("All Fields OG Title");
		});

		it("has OG description", () => {
			expect(result.description).toBe("Full description from OG tags.");
		});

		it("has OG image", () => {
			expect(result.image).toBe("https://example.com/images/all-og.jpg");
		});

		it("has imageWidth and imageHeight", () => {
			expect(result.imageWidth).toBe(1200);
			expect(result.imageHeight).toBe(630);
		});

		it("has video", () => {
			expect(result.video).toBe("https://example.com/videos/intro.mp4");
		});

		it("has locale", () => {
			expect(result.locale).toBe("de_DE");
		});

		it("has publishedDate from article:published_time", () => {
			expect(result.publishedDate).toBe("2025-01-20T10:30:00Z");
		});

		it("has twitterCard and twitterSite", () => {
			expect(result.twitterCard).toBe("summary_large_image");
			expect(result.twitterSite).toBe("@allfields");
		});

		it("has themeColor", () => {
			expect(result.themeColor).toBe("#ff5500");
		});

		it("has keywords", () => {
			expect(result.keywords).toEqual([
				"test",
				"all",
				"fields",
				"comprehensive",
			]);
		});

		it("has canonicalUrl from <link rel=canonical>", () => {
			expect(result.canonicalUrl).toBe(
				"https://example.com/all-fields-canonical",
			);
		});

		it("has siteName from og:site_name", () => {
			expect(result.siteName).toBe("All Fields Site");
		});

		it("has favicon from apple-touch-icon (higher priority size)", () => {
			expect(result.favicon).toBe("https://example.com/apple-icon-180.png");
		});

		it("has author from JSON-LD (fallback from meta author)", () => {
			// JSON-LD author is checked first in the code
			expect(result.author).toBe("JSON-LD Author");
		});

		it("has imageAlt from og:image:alt", () => {
			expect(result.imageAlt).toBe("OG image alt text");
		});

		it("has twitterCreator", () => {
			expect(result.twitterCreator).toBe("@fieldauthor");
		});

		it("defaults statusCode to 0 for parseHTML", () => {
			expect(result.statusCode).toBe(0);
		});
	});

	describe("empty.html", () => {
		const result = parseHTML(loadFixture("empty.html"), BASE);

		it("returns null title", () => {
			expect(result.title).toBeNull();
		});

		it("returns null description", () => {
			expect(result.description).toBeNull();
		});

		it("returns null image", () => {
			expect(result.image).toBeNull();
		});

		it("derives siteName from hostname", () => {
			expect(result.siteName).toBe("example.com");
		});

		it("defaults mediaType to website", () => {
			expect(result.mediaType).toBe("website");
		});

		it("provides default favicon", () => {
			expect(result.favicon).toBe("https://example.com/favicon.ico");
		});

		it("returns null for optional fields", () => {
			expect(result.locale).toBeNull();
			expect(result.video).toBeNull();
			expect(result.twitterCard).toBeNull();
			expect(result.themeColor).toBeNull();
			expect(result.keywords).toBeNull();
			expect(result.author).toBeNull();
			expect(result.publishedDate).toBeNull();
		});
	});
});

describe("extractMetaRefreshUrl", () => {
	it("extracts redirect URL from meta refresh tag", () => {
		const html = loadFixture("meta-refresh.html");
		const url = extractMetaRefreshUrl(html, BASE);
		expect(url).toBe("https://example.com/destination");
	});

	it("returns null when no meta refresh exists", () => {
		const html = loadFixture("minimal.html");
		expect(extractMetaRefreshUrl(html, BASE)).toBeNull();
	});

	it("resolves relative meta refresh URLs", () => {
		const html = '<meta http-equiv="refresh" content="5; url=/new-page">';
		expect(extractMetaRefreshUrl(html, BASE)).toBe(
			"https://example.com/new-page",
		);
	});

	it("resolves relative refresh targets against the document base URL", () => {
		const html = `<html><head>
			<base href="javascript:alert(1)">
			<base href="https://redirects.example.net/paths/">
			<meta http-equiv="refresh" content="0; url=next">
		</head></html>`;

		expect(extractMetaRefreshUrl(html, BASE)).toBe(
			"https://redirects.example.net/paths/next",
		);
	});

	it("extracts meta refresh URLs regardless of attribute order", () => {
		const html = '<meta content="0; url=/new-page" http-equiv="refresh">';
		expect(extractMetaRefreshUrl(html, BASE)).toBe(
			"https://example.com/new-page",
		);
	});

	it("ignores slow refreshes that are not redirects", () => {
		const html = '<meta http-equiv="refresh" content="30; url=/slow-reload">';
		expect(extractMetaRefreshUrl(html, BASE)).toBeNull();
		const daily = '<meta http-equiv="refresh" content="86400;url=/daily">';
		expect(extractMetaRefreshUrl(daily, BASE)).toBeNull();
	});

	it("accepts comma-separated refresh content", () => {
		const html = '<meta http-equiv="refresh" content="0, url=/comma-page">';
		expect(extractMetaRefreshUrl(html, BASE)).toBe(
			"https://example.com/comma-page",
		);
	});
});

describe("entity handling (single decode)", () => {
	it("does not decode entities twice", () => {
		const html = `<html><head>
			<meta property="og:title" content="X &amp;amp; Y">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("X &amp; Y");
	});

	it("does not crash on resurrected out-of-range numeric entities", () => {
		const html = `<html><head>
			<meta property="og:title" content="&amp;#x110000;">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("&#x110000;");
	});

	it("decodes normally-encoded entities exactly once", () => {
		const html = `<html><head>
			<meta property="og:title" content="Tom &amp; Jerry">
			<title>A &lt; B</title>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Tom & Jerry");
	});
});

describe("JSON-LD @graph robustness", () => {
	it("recognizes JSON-LD MIME types case-insensitively", () => {
		const html = `<html><head>
			<script type="Application/LD+JSON">{"name":"Mixed-case JSON-LD"}</script>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Mixed-case JSON-LD");
	});

	it("extracts from an object-valued @graph without dropping the script", () => {
		const html = `<html><head>
			<script type="application/ld+json">{"@graph": {"name": "Solo Node", "description": "From graph object"}}</script>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Solo Node");
		expect(result.description).toBe("From graph object");
	});

	it("inspects root-level properties alongside @graph items", () => {
		const html = `<html><head>
			<script type="application/ld+json">{"name": "Root Name", "@graph": [{"description": "Graph description"}]}</script>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Root Name");
		expect(result.description).toBe("Graph description");
	});
});

describe("implicit body detection", () => {
	it("treats the first flow-content element as the start of the body", () => {
		const html = `<html><title>T</title><p>text</p><img src="/hero.jpg" width="800" height="600">`;
		const result = parseHTML(html, BASE, { includeBodyContent: true });
		expect(result.image).toBe("https://example.com/hero.jpg");
	});

	it("ignores meta tags after the first flow-content element", () => {
		const html = `<html><p>content</p><meta property="og:title" content="Late Title">`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBeNull();
	});
});

describe("fallback chain", () => {
	it("og:title takes priority over twitter:title", () => {
		const html = `<!DOCTYPE html><html><head>
			<meta property="og:title" content="OG Title">
			<meta name="twitter:title" content="Twitter Title">
			<title>HTML Title</title>
		</head><body></body></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("OG Title");
	});

	it("twitter:title is used when og:title is absent", () => {
		const html = `<!DOCTYPE html><html><head>
			<meta name="twitter:title" content="Twitter Title">
			<title>HTML Title</title>
		</head><body></body></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Twitter Title");
	});

	it("JSON-LD name is used when OG and Twitter titles are absent", () => {
		const html = `<!DOCTYPE html><html><head>
			<title>HTML Title</title>
			<script type="application/ld+json">{"name":"JSON-LD Name"}</script>
		</head><body></body></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("JSON-LD Name");
	});

	it("falls back to <title> tag when all else is absent", () => {
		const html = `<!DOCTYPE html><html><head>
			<title>HTML Title</title>
		</head><body></body></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("HTML Title");
	});
});

describe("duplicate metadata precedence", () => {
	it("keeps the first Open Graph value for duplicate tags", () => {
		const html = `<!DOCTYPE html><html><head>
			<meta property="og:title" content="First Title">
			<meta property="og:title" content="Second Title">
			<meta property="og:image" content="https://example.com/first.jpg">
			<meta property="og:image" content="https://example.com/second.jpg">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("First Title");
		expect(result.image).toBe("https://example.com/first.jpg");
	});

	it("does not inherit metadata from Object.prototype", () => {
		Object.defineProperty(Object.prototype, "og:title", {
			configurable: true,
			value: "Polluted title",
		});
		try {
			const result = parseHTML("<title>Document title</title>", BASE);
			expect(result.title).toBe("Document title");
		} finally {
			Reflect.deleteProperty(Object.prototype, "og:title");
		}
	});
});

describe("adversarial metadata", () => {
	it("parses long invalid icon sizes without polynomial backtracking", () => {
		const sizes = "9".repeat(20_000);
		const html = `<html><head><link rel="icon" href="/icon.png" sizes="${sizes}"></head></html>`;
		const startedAt = performance.now();

		const result = parseHTML(html, BASE);

		expect(result.favicon).toBe("https://example.com/icon.png");
		expect(performance.now() - startedAt).toBeLessThan(50);
	});
});

describe("safe metadata URL resolution", () => {
	it("resolves relative metadata against the document base URL", () => {
		const html = `<html><head>
			<base href="javascript:alert(1)">
			<base href="https://cdn.example.net/articles/">
			<base href="https://ignored.example.org/">
			<meta property="og:image" content="hero.jpg">
			<meta property="og:video" content="video.mp4">
			<meta property="og:audio" content="audio.mp3">
			<link rel="canonical" href="story">
			<link rel="icon" href="icon.png">
			<link rel="alternate" type="application/json+oembed" href="oembed.json">
		</head></html>`;

		const result = parseHTML(html, BASE);

		expect(result.image).toBe("https://cdn.example.net/articles/hero.jpg");
		expect(result.video).toBe("https://cdn.example.net/articles/video.mp4");
		expect(result.audio).toBe("https://cdn.example.net/articles/audio.mp3");
		expect(result.canonicalUrl).toBe("https://cdn.example.net/articles/story");
		expect(result.favicon).toBe("https://cdn.example.net/articles/icon.png");
		expect(result.oEmbedUrl).toBe(
			"https://cdn.example.net/articles/oembed.json",
		);
	});

	it("drops unsafe URL schemes from extracted media fields", () => {
		const html = `<!DOCTYPE html><html><head>
			<meta property="og:image" content="javascript:alert(1)">
			<meta property="og:video" content="data:text/html,unsafe">
			<meta property="og:audio" content="file:///tmp/audio.mp3">
			<link rel="icon" href="javascript:alert(2)">
			<link rel="alternate" type="application/json+oembed" href="data:application/json,{}">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.image).toBeNull();
		expect(result.video).toBeNull();
		expect(result.audio).toBeNull();
		expect(result.favicon).toBe("https://example.com/favicon.ico");
		expect(result.oEmbedUrl).toBeNull();
	});

	it("drops extracted URLs with embedded credentials", () => {
		const html = `<!DOCTYPE html><html><head>
			<meta property="og:image" content="https://user:password@cdn.example.com/image.jpg">
			<link rel="canonical" href="https://user:password@example.com/private">
			<link rel="alternate" type="application/json+oembed" href="https://user:password@example.com/oembed">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.image).toBeNull();
		expect(result.canonicalUrl).toBe(BASE);
		expect(result.oEmbedUrl).toBeNull();
	});

	it("falls back when canonical URLs use unsafe schemes", () => {
		const html = `<!DOCTYPE html><html><head>
			<link rel="canonical" href="javascript:alert(1)">
			<meta property="og:url" content="/safe-canonical">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.canonicalUrl).toBe("https://example.com/safe-canonical");
	});

	it("does not return unsafe base URLs from the public parser", () => {
		const result = parseHTML(
			"<html><head><title>Unsafe Base</title></head></html>",
			"javascript:alert(1)",
		);

		expect(result.url).toBe("https://example.com/");
		expect(result.canonicalUrl).toBe("https://example.com/");
	});

	it("uses the safe fallback base for relative metadata URLs", () => {
		const html = `<!DOCTYPE html><html><head>
			<meta property="og:image" content="/image.jpg">
			<meta property="og:video" content="/video.mp4">
			<meta property="og:audio" content="/audio.mp3">
			<link rel="icon" href="/favicon.ico">
			<link rel="alternate" type="application/json+oembed" href="/oembed.json">
		</head></html>`;

		const result = parseHTML(html, "javascript:alert(1)");

		expect(result.image).toBe("https://example.com/image.jpg");
		expect(result.video).toBe("https://example.com/video.mp4");
		expect(result.audio).toBe("https://example.com/audio.mp3");
		expect(result.favicon).toBe("https://example.com/favicon.ico");
		expect(result.oEmbedUrl).toBe("https://example.com/oembed.json");
	});
});

describe("dublin-core.html", () => {
	const result = parseHTML(loadFixture("dublin-core.html"), BASE);

	it("extracts title from dc.title", () => {
		expect(result.title).toBe("Dublin Core Research Paper");
	});

	it("extracts description from dc.description", () => {
		expect(result.description).toBe(
			"A study on metadata standards for academic publishing.",
		);
	});

	it("extracts author from dc.creator", () => {
		expect(result.author).toBe("Dr. Jane Smith");
	});

	it("extracts publishedDate from dc.date", () => {
		expect(result.publishedDate).toBe("2024-03-15");
	});
});

describe("dublin-core dcterms variants", () => {
	it("extracts from dcterms.title when dc.title is absent", () => {
		const html = `<html><head>
			<meta name="dcterms.title" content="DCTERMS Title">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("DCTERMS Title");
	});

	it("extracts from dcterms.description when dc.description is absent", () => {
		const html = `<html><head>
			<meta name="dcterms.description" content="DCTERMS Description">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.description).toBe("DCTERMS Description");
	});

	it("extracts from dcterms.creator when dc.creator is absent", () => {
		const html = `<html><head>
			<meta name="dcterms.creator" content="DCTERMS Author">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.author).toBe("DCTERMS Author");
	});

	it("extracts from dcterms.date when dc.date is absent", () => {
		const html = `<html><head>
			<meta name="dcterms.date" content="2024-06-01">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.publishedDate).toBe("2024-06-01");
	});
});

describe("canonical-differs.html", () => {
	const result = parseHTML(
		loadFixture("canonical-differs.html"),
		"https://example.com/actual-fetched-url",
	);

	it("canonicalUrl comes from og:url", () => {
		expect(result.canonicalUrl).toBe("https://example.com/canonical-page");
	});
});

describe("oEmbed discovery", () => {
	it("extracts oEmbed JSON URL from link tag", () => {
		const html = `<html><head>
			<link rel="alternate" type="application/json+oembed"
				href="https://example.com/oembed?url=test&format=json">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.oEmbedUrl).toBe(
			"https://example.com/oembed?url=test&format=json",
		);
	});

	it("extracts oEmbed XML URL from link tag", () => {
		const html = `<html><head>
			<link rel="alternate" type="text/xml+oembed"
				href="https://example.com/oembed?format=xml">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.oEmbedUrl).toBe("https://example.com/oembed?format=xml");
	});

	it("returns null when no oEmbed link exists", () => {
		const html = "<html><head><title>No oEmbed</title></head></html>";
		const result = parseHTML(html, BASE);
		expect(result.oEmbedUrl).toBeNull();
	});

	it("resolves relative oEmbed URLs", () => {
		const html = `<html><head>
			<link rel="alternate" type="application/json+oembed"
				href="/oembed?url=test">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.oEmbedUrl).toBe("https://example.com/oembed?url=test");
	});
});

describe("link rel token parsing", () => {
	it("handles multi-token rel values for canonical, icon, and oEmbed", () => {
		const html = `<html><head>
			<link rel="alternate canonical" href="/canonical-token">
			<link rel="icon shortcut" href="/favicon-token.ico">
			<link rel="alternate something" type="application/json+oembed" href="/oembed-token">
		</head></html>`;

		const result = parseHTML(html, BASE);

		expect(result.canonicalUrl).toBe("https://example.com/canonical-token");
		expect(result.favicon).toBe("https://example.com/favicon-token.ico");
		expect(result.oEmbedUrl).toBe("https://example.com/oembed-token");
	});
});

describe("itemprop image fallback", () => {
	it("extracts image from meta itemprop=image", () => {
		const html = `<html><head>
			<meta itemprop="image" content="/images/schema-image.jpg">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.image).toBe("https://example.com/images/schema-image.jpg");
	});

	it("extracts image from link itemprop=image", () => {
		const html = `<html><head>
			<link itemprop="image" href="/images/link-schema.jpg">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.image).toBe("https://example.com/images/link-schema.jpg");
	});

	it("og:image takes priority over itemprop image", () => {
		const html = `<html><head>
			<meta property="og:image" content="https://example.com/og.jpg">
			<meta itemprop="image" content="https://example.com/itemprop.jpg">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.image).toBe("https://example.com/og.jpg");
	});
});

describe("json-ld-body.html — JSON-LD in body", () => {
	const result = parseHTML(loadFixture("json-ld-body.html"), BASE, {
		includeBodyContent: true,
	});

	it("extracts title from body JSON-LD headline", () => {
		expect(result.title).toBe("Breaking News From Body JSON-LD");
	});

	it("extracts image from body JSON-LD", () => {
		expect(result.image).toBe("https://example.com/images/body-jsonld.jpg");
	});

	it("extracts first author from JSON-LD author array", () => {
		expect(result.author).toBe("Alice Johnson");
	});

	it("extracts publisher from body JSON-LD", () => {
		expect(result.siteName).toBe("Daily News");
	});
});

describe("body-image-fallback.html — first body <img>", () => {
	const result = parseHTML(loadFixture("body-image-fallback.html"), BASE, {
		includeBodyContent: true,
	});

	it("skips tracking pixel and data URIs, picks hero image", () => {
		expect(result.image).toBe("https://example.com/images/hero-photo.jpg");
	});
});

describe("includeBodyContent defaults to false", () => {
	it("stops tokenizing after the closing head tag", () => {
		const head = "<html><head><title>Head only</title></head>";
		const fullHtml = `${head}<body>${"content ".repeat(1000)}</body></html>`;
		const monitoredHtml = {
			length: fullHtml.length,
			charCodeAt(index: number) {
				if (index >= head.length) {
					throw new Error("body was tokenized");
				}
				return fullHtml.charCodeAt(index);
			},
			slice(start?: number, end?: number) {
				return fullHtml.slice(start, end);
			},
		} as unknown as string;

		expect(parseHTML(monitoredHtml, BASE).title).toBe("Head only");
	});

	it("body JSON-LD is skipped when includeBodyContent is not set", () => {
		const result = parseHTML(loadFixture("json-ld-body.html"), BASE);
		// Falls back to <title> tag in head, NOT the body JSON-LD headline
		expect(result.title).toBe("Fallback Title");
	});

	it("body <img> fallback is skipped when includeBodyContent is not set", () => {
		const result = parseHTML(loadFixture("body-image-fallback.html"), BASE);
		expect(result.image).toBeNull();
	});
});

describe("json-ld-contenturl.html — contentUrl extraction", () => {
	const result = parseHTML(loadFixture("json-ld-contenturl.html"), BASE);

	it("extracts image from contentUrl property", () => {
		expect(result.image).toBe(
			"https://example.com/images/content-url-photo.jpg",
		);
	});

	it("extracts author from creator field", () => {
		expect(result.author).toBe("Creator Field Author");
	});
});

describe("JSON-LD author edge cases", () => {
	it("handles author as string array", () => {
		const html = `<html><head>
			<script type="application/ld+json">{"author":["Alice","Bob"]}</script>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.author).toBe("Alice");
	});

	it("handles author as array of objects with name", () => {
		const html = `<html><head>
			<script type="application/ld+json">{"author":[{"name":"Carol"}]}</script>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.author).toBe("Carol");
	});

	it("handles creator field as fallback", () => {
		const html = `<html><head>
			<script type="application/ld+json">{"creator":"Dan Creator"}</script>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.author).toBe("Dan Creator");
	});
});

describe("news-site author meta tags", () => {
	it("extracts author from sailthru.author", () => {
		const html = `<html><head>
			<meta name="sailthru.author" content="Sailthru Writer">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.author).toBe("Sailthru Writer");
	});

	it("extracts author from parsely-author", () => {
		const html = `<html><head>
			<meta name="parsely-author" content="Parsely Writer">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.author).toBe("Parsely Writer");
	});
});

describe("edge cases", () => {
	it("handles malformed HTML without crashing", () => {
		const html = `<html><head><meta property="og:title" content="Works">
			<meta name="description" content="still works">
			<title>unclosed title`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Works");
		expect(result.description).toBe("still works");
	});

	it("handles empty meta content gracefully", () => {
		const html = `<html><head>
			<meta property="og:title" content="">
			<meta property="og:image" content="">
			<title>Fallback</title>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Fallback");
		expect(result.image).toBeNull();
	});

	it("handles JSON-LD with non-object values", () => {
		const html = `<html><head>
			<script type="application/ld+json">"just a string"</script>
			<script type="application/ld+json">null</script>
			<script type="application/ld+json">42</script>
			<title>Safe</title>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Safe");
	});

	it("handles malformed JSON-LD without crashing", () => {
		const html = `<html><head>
			<script type="application/ld+json">{invalid json!!</script>
			<title>Still Works</title>
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Still Works");
	});

	it("handles duplicate meta tags (first wins)", () => {
		const html = `<html><head>
			<meta property="og:title" content="First">
			<meta property="og:title" content="Second">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("First");
	});

	it("ignores meta tags after </head>", () => {
		const html = `<html><head>
			<meta property="og:title" content="In Head">
		</head><body>
			<meta property="og:description" content="In Body">
		</body></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("In Head");
		expect(result.description).toBeNull();
	});

	it("does not treat body metadata as head metadata when </head> is omitted", () => {
		const html = `<html><body>
			<meta property="og:title" content="Body Title">
			<meta name="description" content="Body description">
		</body></html>`;

		const result = parseHTML(html, BASE);

		expect(result.title).toBeNull();
		expect(result.description).toBeNull();
	});

	it("handles non-numeric image dimensions", () => {
		const html = `<html><head>
			<meta property="og:image" content="https://example.com/img.jpg">
			<meta property="og:image:width" content="auto">
			<meta property="og:image:height" content="">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.image).toBe("https://example.com/img.jpg");
		expect(result.imageWidth).toBeNull();
		expect(result.imageHeight).toBeNull();
	});

	it("prefers og:image:alt over twitter:image:alt", () => {
		const html = `<head>
			<meta property="og:image:alt" content="OG alt">
			<meta name="twitter:image:alt" content="Twitter alt">
		</head>`;
		const r = parseHTML(html, BASE);
		expect(r.imageAlt).toBe("OG alt");
	});

	it("falls back to twitter:image:alt when og:image:alt missing", () => {
		const html = `<head>
			<meta name="twitter:image:alt" content="Twitter alt fallback">
		</head>`;
		const r = parseHTML(html, BASE);
		expect(r.imageAlt).toBe("Twitter alt fallback");
	});

	it("returns null for imageAlt when absent", () => {
		const r = parseHTML(loadFixture("minimal.html"), BASE);
		expect(r.imageAlt).toBeNull();
	});

	it("returns null for twitterCreator when absent", () => {
		const r = parseHTML(loadFixture("minimal.html"), BASE);
		expect(r.twitterCreator).toBeNull();
	});

	it("extracts twitter:creator handle", () => {
		const html = `<head>
			<meta name="twitter:creator" content="@johndoe">
		</head>`;
		const r = parseHTML(html, BASE);
		expect(r.twitterCreator).toBe("@johndoe");
	});
});

describe("audio-lang.html — og:audio and lang", () => {
	const result = parseHTML(loadFixture("audio-lang.html"), BASE);

	it("extracts og:audio", () => {
		expect(result.audio).toBe("https://example.com/podcast/ep42.mp3");
	});

	it("extracts lang from html element", () => {
		expect(result.lang).toBe("de");
	});
});

describe("lang fallback chain", () => {
	it("prefers html lang over content-language", () => {
		const html = `<html lang="fr"><head>
			<meta http-equiv="content-language" content="en">
		</head></html>`;
		const r = parseHTML(html, BASE);
		expect(r.lang).toBe("fr");
	});

	it("falls back to content-language meta tag", () => {
		const html = `<html><head>
			<meta http-equiv="content-language" content="ja">
		</head></html>`;
		const r = parseHTML(html, BASE);
		expect(r.lang).toBe("ja");
	});

	it("falls back to locale prefix when no lang or content-language", () => {
		const html = `<html><head>
			<meta property="og:locale" content="pt_BR">
		</head></html>`;
		const r = parseHTML(html, BASE);
		expect(r.lang).toBe("pt");
	});

	it("returns null when no lang info is available", () => {
		const html = "<html><head><title>No lang</title></head></html>";
		const r = parseHTML(html, BASE);
		expect(r.lang).toBeNull();
	});
});

describe("audio edge cases", () => {
	it("returns null when no og:audio exists", () => {
		const r = parseHTML(loadFixture("og-standard.html"), BASE);
		expect(r.audio).toBeNull();
	});

	it("extracts og:audio:secure_url", () => {
		const html = `<html><head>
			<meta property="og:audio:secure_url" content="https://example.com/audio.mp3">
		</head></html>`;
		const r = parseHTML(html, BASE);
		expect(r.audio).toBe("https://example.com/audio.mp3");
	});
});
