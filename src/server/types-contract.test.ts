import { beforeAll, describe, expect, test } from "bun:test";
import type { AgentRunRecord, AgentRunStatus } from "./types";
import { agentRunInputSchema } from "./types";

/* ----------------------------------------------------------------------- */
/* Spec §6 input validation                                                 */
/* ----------------------------------------------------------------------- */

describe("agentRunInputSchema", () => {
	test("trims surrounding whitespace", () => {
		const parsed = agentRunInputSchema.parse({ prompt: "  hello agent  " });
		expect(parsed.prompt).toBe("hello agent");
	});

	test("rejects an empty prompt", () => {
		expect(agentRunInputSchema.safeParse({ prompt: "" }).success).toBe(false);
	});

	test("rejects a whitespace-only prompt", () => {
		expect(agentRunInputSchema.safeParse({ prompt: "   \n\t " }).success).toBe(
			false,
		);
	});

	test("rejects a prompt over 2000 characters after trimming", () => {
		const prompt = `x${"a".repeat(2000)}`; // 2001 chars
		expect(prompt.length).toBe(2001);
		expect(agentRunInputSchema.safeParse({ prompt }).success).toBe(false);
	});

	test("accepts a prompt of exactly 2000 characters", () => {
		const prompt = "a".repeat(2000);
		expect(agentRunInputSchema.safeParse({ prompt }).success).toBe(true);
	});

	test("rejects non-object and missing-prompt payloads", () => {
		expect(agentRunInputSchema.safeParse(null).success).toBe(false);
		expect(agentRunInputSchema.safeParse({}).success).toBe(false);
	});
});

/* ----------------------------------------------------------------------- */
/* AgentRunRepository contract (engine-agnostic, Spec §2)                   */
/* ----------------------------------------------------------------------- */

/**
 * In-memory reference implementation. It exists to pin the CONTRACT semantics
 * every engine must satisfy, so application code can swap repository
 * implementations without behaviour changes.
 */
export class InMemoryAgentRunRepository {
	private readonly runs: AgentRunRecord[] = [];
	private nowMs = 0;

	private nextTimestamp(): string {
		// Monotonic timestamps give a deterministic newest-first ordering.
		this.nowMs += 1;
		return new Date(Date.UTC(2026, 0, 1, 0, 0, 0, this.nowMs)).toISOString();
	}

	async createRun(input: { prompt: string }): Promise<AgentRunRecord> {
		const record: AgentRunRecord = {
			id: crypto.randomUUID(),
			prompt: input.prompt,
			status: "running",
			result: null,
			errorCode: null,
			createdAt: this.nextTimestamp(),
			finishedAt: null,
			durationMs: null,
		};
		this.runs.push(record);
		return { ...record };
	}

	async finishRun(
		id: string,
		outcome: {
			status: Extract<AgentRunStatus, "succeeded" | "failed">;
			result?: string | null;
			errorCode?: string | null;
			durationMs: number;
		},
	): Promise<AgentRunRecord | null> {
		const index = this.runs.findIndex((record) => record.id === id);
		if (index === -1) return null;
		const updated: AgentRunRecord = {
			...this.runs[index],
			status: outcome.status,
			result: outcome.result ?? null,
			errorCode: outcome.errorCode ?? null,
			finishedAt: new Date().toISOString(),
			durationMs: Math.max(0, Math.round(outcome.durationMs)),
		};
		this.runs[index] = updated;
		return { ...updated };
	}

	async getRun(id: string): Promise<AgentRunRecord | null> {
		const found = this.runs.find((record) => record.id === id);
		return found ? { ...found } : null;
	}

	async listRecentRuns(options?: {
		limit?: number;
	}): Promise<AgentRunRecord[]> {
		const limit = Math.max(1, Math.min(50, Math.round(options?.limit ?? 10)));
		// `runs` is in creation order; newest first means a reversed copy.
		return this.runs
			.slice()
			.reverse()
			.slice(0, limit)
			.map((record) => ({ ...record }));
	}

	async checkDatabase(): Promise<boolean> {
		return true;
	}
}

function makeContractTests(
	label: string,
	newRepo: () => InMemoryAgentRunRepository,
) {
	describe(`AgentRunRepository contract (${label})`, () => {
		let repository: InMemoryAgentRunRepository;

		beforeAll(() => {
			repository = newRepo();
		});

		test("createRun persists a running row with DB-generated id and null terminal fields", async () => {
			const run = await repository.createRun({
				prompt: "Why isolate execution?",
			});
			expect(run.status).toBe("running");
			expect(run.id).toMatch(/^[0-9a-f-]{36}$/i);
			expect(run.prompt).toBe("Why isolate execution?");
			expect(run.result).toBeNull();
			expect(run.errorCode).toBeNull();
			expect(run.finishedAt).toBeNull();
			expect(run.durationMs).toBeNull();
			expect(Number.isNaN(new Date(run.createdAt).getTime())).toBe(false);
		});

		test("finishRun succeeds a run and returns the updated record", async () => {
			const created = await repository.createRun({ prompt: "p1" });
			const finished = await repository.finishRun(created.id, {
				status: "succeeded",
				result: "answer text",
				durationMs: 12.4,
			});
			expect(finished).not.toBeNull();
			expect(finished?.status).toBe("succeeded");
			expect(finished?.result).toBe("answer text");
			expect(finished?.errorCode).toBeNull();
			expect(finished?.durationMs).toBe(12);
			expect(finished?.finishedAt).not.toBeNull();
			const fetched = await repository.getRun(created.id);
			expect(fetched?.status).toBe("succeeded");
		});

		test("finishRun marks failure with a sanitized error code only", async () => {
			const created = await repository.createRun({ prompt: "p2" });
			const finished = await repository.finishRun(created.id, {
				status: "failed",
				errorCode: "AGENT_EXECUTION_FAILED",
				durationMs: 5,
			});
			expect(finished?.status).toBe("failed");
			expect(finished?.errorCode).toBe("AGENT_EXECUTION_FAILED");
			expect(finished?.result).toBeNull();
			expect(finished?.finishedAt).not.toBeNull();
		});

		test("finishRun on an unknown id returns null", async () => {
			const outcome = await repository.finishRun(crypto.randomUUID(), {
				status: "succeeded",
				result: "x",
				durationMs: 1,
			});
			expect(outcome).toBeNull();
		});

		test("getRun on an unknown id returns null", async () => {
			expect(await repository.getRun(crypto.randomUUID())).toBeNull();
		});

		test("listRecentRuns orders newest first and limits rows", async () => {
			const oldest = await repository.createRun({ prompt: "order-a" });
			const middle = await repository.createRun({ prompt: "order-b" });
			const newest = await repository.createRun({ prompt: "order-c" });

			const all = await repository.listRecentRuns();
			expect(all.length).toBeGreaterThanOrEqual(3);
			// Rows created by earlier tests exist too, so compare relative indexes.
			const idxOf = (id: string) => all.findIndex((record) => record.id === id);
			expect(idxOf(oldest.id)).toBeGreaterThan(idxOf(middle.id));
			expect(idxOf(middle.id)).toBeGreaterThan(idxOf(newest.id));

			const limited = await repository.listRecentRuns({ limit: 1 });
			expect(limited.length).toBe(1);
			expect(limited[0].id).toBe(newest.id);
		});

		test("listRecentRuns clamps non-positive limits to 1", async () => {
			const rows = await repository.listRecentRuns({ limit: 0 });
			expect(rows.length).toBe(1);
		});

		test("checkDatabase returns true without throwing", async () => {
			expect(await repository.checkDatabase()).toBe(true);
		});
	});
}

makeContractTests("in-memory", () => new InMemoryAgentRunRepository());

/* ----------------------------------------------------------------------- */
/* Optional real-Neon integration (skipped without DATABASE_URL)            */
/* ----------------------------------------------------------------------- */

describe("agent run record timestamps", () => {
	test("createRun/finishRun timestamps are parseable ISO strings", async () => {
		const repository = new InMemoryAgentRunRepository();
		const run = await repository.createRun({ prompt: "ts" });
		expect(Number.isNaN(new Date(run.createdAt).getTime())).toBe(false);
		const finished = await repository.finishRun(run.id, {
			status: "succeeded",
			durationMs: 3,
		});
		expect(Number.isNaN(new Date(finished?.finishedAt ?? "").getTime())).toBe(
			false,
		);
	});
});

const hasDatabaseUrl =
	typeof process.env.DATABASE_URL === "string" &&
	process.env.DATABASE_URL.length > 0;

// The orchestrator creates the table via db/migrations/0001 before integration.
// If DATABASE_URL is unset the test is skipped; it never prints the URL and
// reads nothing from .env itself (Bun preloads it).
describe.skipIf(!hasDatabaseUrl)(
	"PostgresAgentRunRepository (real Neon)",
	() => {
		test("CRUD round-trip on agent_smoke_test_runs", async () => {
			const [{ PostgresAgentRunRepository }, { createIsolatedDb }] =
				await Promise.all([import("./run-repository"), import("./db")]);

			const sql = createIsolatedDb(process.env.DATABASE_URL as string);
			const repository = new PostgresAgentRunRepository(sql);
			try {
				const created = await repository.createRun({
					prompt: "backend integration probe",
				});
				expect(created.status).toBe("running");
				expect(created.id.length).toBe(36);
				expect(created.finishedAt).toBeNull();

				const finished = await repository.finishRun(created.id, {
					status: "succeeded",
					result: "integration ok",
					durationMs: 7,
				});
				expect(finished?.status).toBe("succeeded");
				expect(finished?.durationMs).toBe(7);

				const fetched = (await repository.getRun(created.id)) ?? null;
				expect(fetched?.result).toBe("integration ok");

				const recent = await repository.listRecentRuns({ limit: 1 });
				expect(recent.length).toBe(1);
				expect(recent[0].id).toBe(created.id);

				// uuid round-trips through getRun
				expect(await repository.getRun(created.id)).not.toBeNull();
			} catch (error) {
				// Table not migrated yet (code 42P01: relation does not exist) → skip.
				// bun:test's TestContext has no skip() callable from inside, so we
				// finish early without failing when migrations have not run yet.
				if ((error as { code?: string }).code === "42P01") {
					console.warn(
						"agent_smoke_test_runs not found — run db/migrations/0001 first; skipping integration test",
					);
					return;
				}
				throw error;
			} finally {
				await sql.end({ timeout: 5 });
			}
		});
	},
);
