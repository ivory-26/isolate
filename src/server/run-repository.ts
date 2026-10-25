import type { AgentRunRecord, AgentRunStatus } from './types'

/**
 * Persistence contract for `agent_smoke_test_runs` (Spec §5).
 *
 * OWNERSHIP: The file contents (interface below) are the cross-agent contract.
 * The backend agent implements and owns this file; the UI and route code must
 * import it only through `./functions.ts` server functions, never directly.
 */
export interface AgentRunRepository {
  /** Persists a run, with `prompt` already validated/trimmed, status `running`. */
  createRun(input: { prompt: string }): Promise<AgentRunRecord>

  /** Moves a run to a terminal state. `result`/`errorCode` are never both sensitive. */
  finishRun(
    id: string,
    outcome: {
      status: Extract<AgentRunStatus, 'succeeded' | 'failed'>
      result?: string | null
      errorCode?: string | null
      durationMs: number
    },
  ): Promise<AgentRunRecord | null>

  getRun(id: string): Promise<AgentRunRecord | null>

  /** Newest first (Spec §4 step 8). */
  listRecentRuns(options?: { limit?: number }): Promise<AgentRunRecord[]>

  /**
   * Connectivity probe for the health check (Spec §2).
   * Must return false (not throw) when the database is unreachable, and
   * must never include connection details in its error output.
   */
  checkDatabase(): Promise<boolean>
}
