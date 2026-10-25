import { createServerFn } from '@tanstack/react-start'
import { agentRunInputSchema } from './types'
import type { AgentRunRecord, AgentRunResponse, HealthResponse } from './types'

/**
 * Server-only public API of the spike (Spec §6).
 *
 * OWNERSHIP: The backend agent implements this file. The UI imports these
 * exports ONLY. All provider/database/secret logic stays on the server.
 *
 * Contract:
 * - `submitAgentRun({ prompt })` validates input BEFORE any model call,
 *   persists a `running` row, executes the Mastra agent server-side, and
 *   persists a terminal status. Rate/size protection is basic (Spec §6):
 *   a per-process sliding window is acceptable for the spike.
 * - Failures return the discriminated union — never throw raw errors to the
 *   client, never include stack traces, env values, provider payloads, or
 *   connection strings.
 */

/**
 * Not yet implemented — will be implemented by the backend agent.
 * UI agent: you may already build against these exports; they typecheck.
 * @throws never once implemented
 */
export const submitAgentRun = createServerFn({ method: 'POST' })
  .validator((data: unknown) => agentRunInputSchema.parse(data))
  .handler(async (): Promise<AgentRunResponse> => {
    throw new Error('NOT_IMPLEMENTED: submitAgentRun')
  })

export const getRecentRuns = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AgentRunRecord[]> => [],
)

export const getHealth = createServerFn({ method: 'GET' }).handler(
  async (): Promise<HealthResponse> => ({
    ok: false,
    db: false,
    app: 'isolate-mvp',
    version: '0.0.0',
  }),
)
