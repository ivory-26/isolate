import { z } from 'zod'

/**
 * Shared contracts for the MVP compatibility spike.
 *
 * OWNERSHIP: This file is owned by the orchestrator. Backend and UI agents
 * must not edit it; report needed changes back through coordination.
 *
 * These types are exported to both server code and client code, so they must
 * never import database, model-provider, or secret-dependent modules.
 */

/** Spec §6: prompts are trimmed, non-empty, and capped. */
export const AGENT_RUN_PROMPT_MAX_LENGTH = 2000

export const agentRunInputSchema = z.object({
  prompt: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, 'Prompt is required').max(AGENT_RUN_PROMPT_MAX_LENGTH)),
})

export type AgentRunInput = z.infer<typeof agentRunInputSchema>

/** Spec §5: the persisted run record shape (JSON-serializable dates). */
export type AgentRunStatus = 'running' | 'succeeded' | 'failed'

export type AgentRunRecord = {
  id: string
  prompt: string
  status: AgentRunStatus
  result: string | null
  errorCode: string | null
  createdAt: string
  finishedAt: string | null
  durationMs: number | null
}

/**
 * Stable POST /api-agent-run response shape (Spec §6).
 * Discriminated union so failures never leak stack traces, provider
 * payloads, or connection strings — only a short code and safe message.
 */
export type AgentRunResponse =
  | { ok: true; run: AgentRunRecord }
  | { ok: false; code: AgentRunErrorCode; message: string }

/** Bounded, non-sensitive error codes stored in the run row / returned to clients. */
export type AgentRunErrorCode =
  | 'VALIDATION_FAILED'
  | 'MISSING_CONFIG'
  | 'AGENT_EXECUTION_FAILED'
  | 'DB_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INTERNAL'

/** GET health response (Spec §2 + §8): DB availability without credentials. */
export type HealthResponse = {
  ok: boolean
  db: boolean
  app: string
  version: string
}
