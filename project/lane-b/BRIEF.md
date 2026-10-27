# Sprint B — Runtime & Orchestration Plane (lane brief)

Sprint B owns runtime execution: the worker (B1), Mastra agent/workflow runtime (B2), the visual workflow compiler (B3), and GitHub integration contracts (B4). Lane integration branch is `sprint/b-runtime`.

## Hard rules (no negotiation)
1. Your session owns a narrow file set (below). Never touch other directories, never `package.json`, `bun.lock`, root configs, `project/*.md` root files, `.github/*`, or `apps/web/**`. Report instead.
2. Never read/print `.env*`. Tests that need `DATABASE_URL` auto-skip; you may run `bun --env-file ../isolate/.env test` from your worktree root but never print values.
3. Sprint A concurrently implements `@isolate/db` repositories — code to the INTERFACES in `packages/db/src/repositories/*` and to the ALREADY-STATED semantics (transition guard, atomic claim, payload-bound approvals). Do not import concrete implementations or add anything to packages you don't own.
4. If a shared contract is missing/wrong for your needs, extend it in your REPORT with a proposed diff text, not by editing `packages/shared`.
5. All loops bounded (state budgets, attempt counters, timeouts). No "keep trying until success".

## Shared operating procedure
- Commands from your worktree root (`C:\Users\Sahil\Documents\worktrees\<name>`).
- Gates before commit: `bunx biome check <your-dir>` → `bunx --bun tsc -p <your-dir>/tsconfig.json --noEmit` → `bun test <your-dir>`.
- Tabs, double quotes; `bunx biome check --write <your-dir>` first.
- Mastra questions: the installed d.ts is authoritative (`node_modules/@mastra/core/dist/**`); docs may drift (recorded lesson). Use Context7 via your `execute` MCP tools for orientation, then verify against the installed types.

## Task B1 — Durable worker loop (worktree `sb1-worker`, branch `task/sb1-worker`)
Owner of: `apps/worker/src/**`.
1. Replace the bootstrap stub in `main.ts` with a real `WorkerLoop`: bounded poll tick (`pollIntervalMs`), loop acknowledgment protocol per `contracts.ts` (claim → run handler with heartbeat ctx → ack/ackFail), graceful AbortSignal/INT/TERM stop, and a reaper ticker (`reaperIntervalMs`) calling `queue.requeueExpiredLeases(Date.now())`.
2. Retryable verdicts → `ackFail` (dead-letter decision is the queue's job, not the handler's); non-retryable short-circuit without extra attempts; heartbeat-on-long-tick helper must keep leases alive without spamming (e.g. half lease seconds).
3. Errors: catch everything, map unknown errors to `INTERNAL` (from `@isolate/shared`), sanitize messages (no payloads/stacks/URLs with keys), structured logs only via `Logger` (redacting).
4. Tests: in-memory fake queue + fake handler covering claim/heartbeat/ack/ackFail/retry/dead-letter/lease-expiry paths + clean-shutdown test. No real DB required.
Deliverables: worker loop with tests; report includes the exact lifecycle state diagram text.

## Task B2 — Mastra agent + bounded SDLC workflow (worktree `sb2-mastra`, branch `task/sb2-mastra`)
Owner of: `packages/mastra/src/**`.
1. Verify the installed `@mastra/core` d.ts for: Agent config forms (note: `OpenAICompatibleConfig` uses `{ providerId, modelId, url, apiKey }` in the installed 1.79.0), `createWorkflow`/`createStep` signatures, tool definition + input/output schemas. Cite file paths in your report.
2. Build a real `createSdlcWorkflow` on Mastra workflows implementing the ARCHITECTURE.md §9 machine from the `defaultSdlcPlan` template: planning → executing → validating → (bounded) repairing → review_ready → pull_request_created, with explicit terminal failure and approval suspension via `suspend()`/resume, repair budget enforced by attempt counter passed through workflow state (never by raw retry).
3. Type the tools registry over `@mastra/core/tools` wiring `createTool` against the PolicyDecision gate from `tools/policy.ts` (deny-by-default for snapshot; sensitive actions must route to approval, never silently allowed).
4. Model-agnostic fake: tests never hit a real provider. Build a FakeModel per installed types and assert prompt/turn budget bounds + suspension/resume paths + policy denials.
Deliverables: compiling workflow with mocked-provider tests + report on installed d.ts evidence.

## Task B3 — Visual workflow registry/validation/compiler (worktree `sb3-wf-schema`, branch `task/sb3-wf-schema`)
Owner of: `packages/workflow-schema/src/**`.
1. Expand the node registry: per-type Zod configs (agent.task needs agent id + prompt template refs; tool.call needs tool name that MUST exist in a supplied allowlist; approval.gate needs action + risk; condition.switch needs branch list — enumerated, no free expressions; validate.loop needs bounded `maxAttempts` referenced to task budget).
2. `validateDefinition`: duplicate ids, missing edge endpoints, unreachable required terminal step, cycles (condition.switch with back edges to executed set unsupported → error), node-type-specific config validation, and `UNSAFE_CONFIG` (checks the config uses only the enumerated fields).
3. `compileWorkflow`: topological order, service performed from the version-pinned definition; reject unvalidated input; annotate each step with its validated config. Still no dynamic code generation. No `eval`, no `new Function`, no arbitrary TS.
4. Tests: valid minimal graph (agents_tasks + validate loop + approval gate), each class of rejection, cycle rejection, version pinning, compiler determinism.
Deliverables: tested registry validate+compile + report (supported subset list + explicitly rejected shapes).

## Task B4 — GitHub connector foundations (worktree `sb4-integrations`, branch `task/sb4-integrations`)
Owner of: `packages/integrations/src/**`.
1. Implement `createPrCreator` (replace the not-implemented stub) using REST via `Bun.fetch`. No live-network correctness requirement — token redaction, headers, endpoint building, error mapping (404 → NOT_FOUND, 403 → POLICY_DENIED, 429 → RATE_LIMITED; network errors → retry-only code). Zod-validated response parse; spec validation rejects empty branches.
2. Enforce: no credentials in logs or thrown messages; every call site records through the `AuditRepository`-shaped interface you accept as a dependency parameter (mock in tests).
3. Redaction: tokens never in error messages — write a test asserting a fabricated token-like error message never reaches the caller through the returned Result.
4. Tests: use `fetch.mock` (Bun mockModule / intercept) rather than a server; cover success, validation failure, rate-limit, network failure paths.
Deliverables: compiling connector + tests + report (endpoint/permission list + redaction proof).
