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

	it("handles duplicate meta tags (last wins)", () => {
		const html = `<html><head>
			<meta property="og:title" content="First">
			<meta property="og:title" content="Second">
		</head></html>`;
		const result = parseHTML(html, BASE);
		expect(result.title).toBe("Second");
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
});
