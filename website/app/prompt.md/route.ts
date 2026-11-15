import { agentPrompt } from "@/lib/agent-prompt";

export const dynamic = "force-static";

// The coding-agent task as plain Markdown, for agents that fetch URLs.
export function GET() {
	return new Response(agentPrompt, {
		headers: { "content-type": "text/markdown; charset=utf-8" },
	});
}
