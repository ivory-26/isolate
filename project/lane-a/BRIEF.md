# Sprint A — Foundation & Data Plane (lane brief)

Sprint A owns the platform foundation: contracts/infrastructure types (Task A1) and the full Neon data layer (Task A2). You are one of two agents in this lane; the lane integration branch is `sprint/a-foundation`.

## Hard rules (no negotiation)
1. Your session owns exactly ONE directory. Do not create, modify, delete, or rename anything outside it — not even `bun.lock`, `package.json`, `tsconfig`, `project/*`, `README*`, `.github/*`. Report needed change instead.
2. Never touch `.env*` (never read, print, or copy it). Live tests auto-skip without `DATABASE_URL`; you may run `bun --env-file ../isolate/.env test` from your worktree root, but never print variable values.
3. Contracts in `packages/shared` are frozen interface surface: if you believe one is wrong, REPORT it; do not edit another package's files.
4. Commit localized coherent changes on your own branch with message prefix `task/...`; never push; never commit secrets.
5. All loops bounded. If a fix takes more than 3 failed attempts, stop, write the failure in your report, and move on.

## Shared operating procedure
- Commands run from your worktree root (`C:\Users\Sahil\Documents\worktrees\<name>`).
- Gates before commit: `bunx biome check <your-dir>` → `bun tsc -p <your-dir>/tsconfig.json --noEmit` (via `bunx --bun tsc`) → `bun test <your-dir>`.
- Formatting: tabs, double quotes, Biome defaults; run `bunx biome check --write <your-dir>` before the real check.

## Task A1 — Implement `@isolate/shared` (worktree `sa1-shared`, branch `task/sa1-shared`)
Owner of: `packages/shared/**`.
1. Review existing contract sources (ids/branding, Result, PlatformError/ErrorCode, task state machine, run-event vocabulary, Logger interface + console logger). Keep the public surface.
2. Add proper Zod schemas for: task status transitions request, run-event envelope (already partially present), worker config-isolated field types, and a `redactDeep` that walks plain objects (detect non-plain values, cap traversal depth at 6) for logging/audit payload hygiene.
3. Tests exercising: state machine legality (every declared transition + at least one rejection per state), Result helpers, PlatformError retryability mapping, redactFields + redactDeep with a planted fake secret, branded-id compile behavior.
4. Export the new schemas from `src/index.ts`.
Deliverables: compiling, tested, linting code + a summary that lists every public export you added.

## Task A2 — Implement `@isolate/db` (worktree `sa2-db`, branch `task/sa2-db`)
Owner of: `packages/db/**`.
1. Write migration `migrations/0002_platform_core.sql` implementing ARCHITECTURE.md §5 minimal viable subset with `CREATE TABLE IF NOT EXISTS`: organizations, users, memberships (unique org+user, role enum), repositories (unique org+full_name), integrations + integration_permissions, workflow_definitions + workflow_versions (unique definition+version), tasks (unique org+idempotency_key, status/branch columns, budget JSONB), task_attempts (unique task+attempt_index), workflow_runs, run_events, approvals (payload binding via payload_sha256, expiry), tool_invocations, audit_events, usage_records. Every tenant-owned table gets `organization_id` with FK. Index the task status list scans + queue claim path. Postgres ≥13 syntax only.
2. Implement repositories over the contracts: TaskRepository (with the transition guard enforcing TASK_STATE_TRANSITIONS + optimistic `expectedStatus`), TaskAttemptRepository, QueueRepository (`claimNext` must be one atomic statement: `UPDATE ... SET status='claimed', lease... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`; `ackFail` computes retry/dead-letter from `attempts` vs stored `max_attempts` — callers can't supply counters), ApprovalRepository (decide only on exact `payload_sha256` + pending + not-expired), WorkflowRunRepository, AuditRepository + ToolInvocationRepository. postgres.js prepared=false; parameters always bound; NEVER interpolate values.
3. Each repository gets unit/contract tests (`bun:test`) that skip cleanly without DATABASE_URL (`test.skipIf(!process.env.DATABASE_URL)`) plus a pure-logic test set for transition/ackFail dead-letter math against an in-memory fake where possible.
4. Add a README section inside your report: migration filename, how to apply (`psql $DATABASE_URL -f ...`), and live test prerequisites. Do not run the migration against Neon yourself — report request; the coordinator applies it.
Deliverables: compiling, tested repositories + schema SQL + explicit list of migration files.
