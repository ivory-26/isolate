import { createServerFn } from "@tanstack/react-start";
import { runAgent } from "./agent";
import { getDb } from "./db";
import { loadServerConfig } from "./env";
import { PostgresAgentRunRepository } from "./run-repository";
import {
	type AgentRunRecord,
	type AgentRunResponse,
	agentRunInputSchema,
	type HealthResponse,
} from "./types";

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

/** Setup guidance shown when required configuration is missing (no values). */
const MISSING_CONFIG_MESSAGE =
	"Server configuration is incomplete. Create .env from .env.example with DATABASE_URL, MODEL_PROVIDER, LLM_API_KEY and LLM_MODEL, then restart the server.";

const DB_UNAVAILABLE_MESSAGE =
	"Could not reach the database. Verify the Neon connection and try again.";

const AGENT_FAILURE_MESSAGE =
	"The agent could not complete the request. Verify the model provider configuration and try again.";

const INTERNAL_MESSAGE = "Internal server error. Try again.";

/** Basic per-process rate limit (Spec §6): N requests per minute, single bucket. */
const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitTimestamps: number[] = [];

/** Sliding-window rate limiter; returns false when over the budget. */
function allowRequest(now: number): boolean {
	while (
		rateLimitTimestamps.length > 0 &&
		now - rateLimitTimestamps[0] > RATE_LIMIT_WINDOW_MS
	) {
		rateLimitTimestamps.shift();
	}
	if (rateLimitTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) return false;
	rateLimitTimestamps.push(now);
	return true;
}

/**
 * Logs an unexpected failure server-side. Only the error CLASS name is
 * logged: provider and postgres error messages can embed connection strings,
 * so their text must never land in output (Spec §6/§8).
 */
function logUnexpected(scope: string, error: unknown): void {
	console.error(
		`[${scope}] unexpected failure:`,
		error instanceof Error ? error.name : "unknown",
	);
}

export const submitAgentRun = createServerFn({ method: "POST" })
	.validator((data: unknown) => agentRunInputSchema.parse(data))
	.handler(async ({ data }): Promise<AgentRunResponse> => {
		try {
			if (!allowRequest(Date.now())) {
				return {
					ok: false,
					code: "RATE_LIMITED",
					message: "Too many requests. Wait a minute and try again.",
				};
			}

			const loaded = loadServerConfig();
			if (!loaded.ok) {
				console.error(
					"[submitAgentRun] server configuration missing or invalid",
				);
				return {
					ok: false,
					code: "MISSING_CONFIG",
					message: MISSING_CONFIG_MESSAGE,
				};
			}

			const sql = getDb();
			if (!sql) {
				return {
					ok: false,
					code: "MISSING_CONFIG",
					message: MISSING_CONFIG_MESSAGE,
				};
			}
			const repository = new PostgresAgentRunRepository(sql);

			let run: AgentRunRecord;
			try {
				run = await repository.createRun({ prompt: data.prompt });
			} catch (error) {
				logUnexpected("submitAgentRun.db-create", error);
				return {
					ok: false,
					code: "DB_UNAVAILABLE",
					message: DB_UNAVAILABLE_MESSAGE,
				};
			}

			const startedAt = Date.now();
			try {
				const text = await runAgent(data.prompt, loaded.config);
				const finished = await repository.finishRun(run.id, {
					status: "succeeded",
					result: text,
					durationMs: Date.now() - startedAt,
				});
				return { ok: true, run: finished ?? run };
			} catch (error) {
				// Provider/model failure (including the 60s timeout guard) or a
				// post-generate DB write. Persist a sanitized terminal status — never
				// provider payloads (Spec §5) — and return the safe message only.
				logUnexpected("submitAgentRun.agent", error);
				try {
					await repository.finishRun(run.id, {
						status: "failed",
						errorCode: "AGENT_EXECUTION_FAILED",
						durationMs: Date.now() - startedAt,
					});
				} catch (persistError) {
					logUnexpected("submitAgentRun.db-finish", persistError);
				}
				return {
					ok: false,
					code: "AGENT_EXECUTION_FAILED",
					message: AGENT_FAILURE_MESSAGE,
				};
			}
		} catch (error) {
			logUnexpected("submitAgentRun", error);
			return { ok: false, code: "INTERNAL", message: INTERNAL_MESSAGE };
		}
	});

export const getRecentRuns = createServerFn({ method: "GET" }).handler(
	async (): Promise<AgentRunRecord[]> => {
		try {
			const loaded = loadServerConfig();
			if (!loaded.ok) return [];
			const sql = getDb();
			if (!sql) return [];
			const repository = new PostgresAgentRunRepository(sql);
			return await repository.listRecentRuns({ limit: 10 });
		} catch (error) {
			// History is non-critical; fail empty and never throw to the wire.
			logUnexpected("getRecentRuns", error);
			return [];
		}
	},
);

export const getHealth = createServerFn({ method: "GET" }).handler(
	async (): Promise<HealthResponse> => {
		let db = false;
		try {
			const loaded = loadServerConfig();
			if (loaded.ok) {
				const sql = getDb();
				if (sql) {
					db = await new PostgresAgentRunRepository(sql).checkDatabase();
				}
			}
		} catch (error) {
			logUnexpected("getHealth", error);
		}
		// `ok` refers to the HTTP endpoint itself, not the database (Spec §2).
		return { ok: true, db, app: "isolate-mvp", version: "0.0.0" };
	},
);
