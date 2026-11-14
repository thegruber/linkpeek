import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import {
	BenchmarkChart,
	BenchmarkDate,
	BenchmarkHighlights,
	BenchmarkMethod,
} from "@/components/benchmarks";
import { ParserDemo } from "@/components/parser-demo";
import { LiveResult } from "@/components/self-preview";

export function getMDXComponents(components?: MDXComponents) {
	return {
		...defaultMdxComponents,
		BenchmarkChart,
		BenchmarkDate,
		BenchmarkHighlights,
		BenchmarkMethod,
		LiveResult,
		ParserDemo,
		...components,
	} satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
	type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
