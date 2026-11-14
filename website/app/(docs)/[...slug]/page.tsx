import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
	MarkdownCopyButton,
	ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import {
	absoluteUrl,
	appName,
	author,
	ogImagePath,
	openGraphDefaults,
	repository,
	siteUrl,
} from "@/lib/shared";
import { pagePath, source } from "@/lib/source";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface Props {
	params: Promise<{ slug: string[] }>;
}

export default async function Page({ params }: Props) {
	const { slug } = await params;
	const page = source.getPage(slug);
	if (!page) notFound();
	const MDX = page.data.body;
	const url = absoluteUrl(pagePath(page));

	return (
		<DocsPage toc={page.data.toc} full={page.data.full}>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON-LD
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(articleSchema(page.data, url)).replaceAll(
						"<",
						"\\u003c",
					),
				}}
			/>
			<DocsTitle>{page.data.heading ?? page.data.title}</DocsTitle>
			<DocsDescription className="mb-0">
				{page.data.description}
			</DocsDescription>
			<div className="flex flex-row items-center gap-2 border-b pb-6">
				<MarkdownCopyButton
					markdownUrl={`${basePath}${pagePath(page)}index.md`}
				/>
				<ViewOptionsPopover
					markdownUrl={`${url}index.md`}
					githubUrl={`${repository}/blob/main/website/content/docs/${page.path}`}
				/>
			</div>
			<DocsBody>
				<MDX
					components={getMDXComponents({
						a: createRelativeLink(source, page),
					})}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export function generateStaticParams() {
	return source.generateParams().filter((params) => params.slug.length > 0);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const page = source.getPage(slug);
	if (!page) notFound();
	const title = page.data.metaTitle ?? page.data.title;
	const image = {
		url: absoluteUrl(ogImagePath(page.slugs)),
		width: 1200,
		height: 630,
		alt: title,
	};
	return {
		title,
		description: page.data.description,
		alternates: {
			canonical: absoluteUrl(pagePath(page)),
			types: { "text/markdown": `${absoluteUrl(pagePath(page))}index.md` },
		},
		openGraph: {
			...openGraphDefaults,
			type: "article",
			url: absoluteUrl(pagePath(page)),
			title: `${title} · ${appName}`,
			description: page.data.description,
			images: [image],
		},
		twitter: {
			card: "summary_large_image",
			title: `${title} · ${appName}`,
			description: page.data.description,
			images: [image],
		},
	};
}

function articleSchema(
	data: { title: string; metaTitle?: string; description?: string },
	url: string,
) {
	const headline = data.metaTitle ?? data.title;
	return {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "TechArticle",
				headline,
				description: data.description,
				inLanguage: "en",
				url,
				isPartOf: siteUrl,
				about: { "@id": `${siteUrl}#software` },
				author: { "@type": "Person", name: author },
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{
						"@type": "ListItem",
						position: 1,
						name: "linkpeek documentation",
						item: siteUrl,
					},
					{ "@type": "ListItem", position: 2, name: headline, item: url },
				],
			},
		],
	};
}
