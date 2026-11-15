import { AgentPrompt } from "@/components/agent-prompt";
import { agentPrompt } from "@/lib/agent-prompt";
import { siteUrl } from "@/lib/shared";

/** The agent prompt with its published URL, for MDX and server pages. */
export function AgentPromptBlock({ className }: { className?: string }) {
	return (
		<AgentPrompt
			prompt={agentPrompt}
			promptUrl={`${siteUrl}prompt.md`}
			className={className}
		/>
	);
}
