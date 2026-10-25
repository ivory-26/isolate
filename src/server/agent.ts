import { Agent } from "@mastra/core/agent";
import type { ServerConfig } from "./env";

/**
 * Server-only Mastra agent (SPEC.md §2/§3).
 *
 * The model uses the verified object form for @mastra/core@1.79.0
 * (`OpenAICompatibleConfig` in the shipped types):
 *
 *   new Agent({ id, name, instructions, model: { id: `${provider}/${model}`, url, apiKey } })
 *
 * The agent is constructed lazily on first use so importing this module has no
 * global side effects and tests never touch a real provider.
 */

export const AGENT_ID = "agent-smoke-test";
export const AGENT_NAME = "Isolate Smoke Test Agent";
export const AGENT_INSTRUCTIONS =
	"You are a concise, helpful smoke-test agent. Answer the user prompt directly " +
	"in a short, self-contained way. Use plain prose; avoid lists unless asked.";

export const AGENT_TIMEOUT_MS = 60_000;

let cachedAgent: Agent | null;

/** Builds (or returns the cached) Mastra Agent for the resolved configuration. */
export function getAgent(config: ServerConfig): Agent {
	if (cachedAgent) return cachedAgent;
	cachedAgent = new Agent({
		id: AGENT_ID,
		name: AGENT_NAME,
		instructions: AGENT_INSTRUCTIONS,
		model: {
			id: config.mastraModelId,
			url: config.llmBaseUrl,
			apiKey: config.llmApiKey,
		},
	});
	return cachedAgent;
}

/**
 * Runs a bounded, non-streaming generation and returns the response text.
 *
 * Throws on provider/model failure or on the timeout guard; callers (functions.ts)
 * must catch and map to a sanitised error — this function must never include
 * provider payloads, stack traces, or URLs with credentials in user-facing paths.
 */
export async function runAgent(
	prompt: string,
	config: ServerConfig,
): Promise<string> {
	const agent = getAgent(config);
	const output = await agent.generate(prompt, {
		abortSignal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
	});
	return output.text;
}
