# Tasks

One owner per task, explicit file ownership, dependencies, acceptance criteria, Definition of Done. Statuses: planned / in progress / blocked / done.

## MVP-1 — Compatibility spike (SPEC.md §§1–8)
- Owner: orchestrator (AGENTS.md protocol applied via typed-contract parallelism rather than worktrees; see project/DECISIONS.md).
- Status: in progress
- File ownership:
  - Orchestrator: `package.json`, `.gitignore`, `.env.example`, `src/server/types.ts`, `src/server/run-repository.ts` (interface only), `src/server/functions.ts` (stubs only), root docs (`README.md`, `project/*`), Neon project + migration execution, integration validation.
  - Backend agent: `src/server/env.ts`, `src/server/db.ts`, `src/server/run-repository.ts` (implementation), `src/server/agent.ts`, `src/server/functions.ts` (implementation), `db/migrations/0001_agent_smoke_test_runs.sql`, backend tests (`src/server/*.test.ts`).
  - UI agent: `src/routes/index.tsx`, `src/routes/__root.tsx`, `src/styles.css`.
- Dependencies: contracts precede both agents (done: commit ad39325); Neon migration precedes live-DB tests (done: applied to project `dark-dream-15274602`).
- Acceptance criteria: SPEC.md §8 checklist (all items verified or explicitly documented as blocked).
- DoD: all §8 items checked with command-level evidence in project/STATUS.md; docs updated; committed to `main`.

### Subtasks
- [x] MVP-1a Sprint setup: git init, scaffold, deps, contracts, .env.example (orchestrator)
- [x] MVP-1b Neon project creation + schema application + verification (orchestrator, MCP)
- [x] MVP-1c Backend implementation (backend agent)
- [x] MVP-1d UI page (UI agent)
- [x] MVP-1e Integration validation: generate-routes, typecheck, lint, bun test, build (orchestrator)
- [x] MVP-1f End-to-end smoke with real provider key — production-build RPC: success (`succeeded`, 683 ms, verified in Neon), oversized-prompt rejection before model call, health check `{ok,db:true}`; ACP/A2A fact-checked as unnecessary for now
- [x] MVP-1g Docs handoff: README commands/troubleshooting, STATUS.md evidence (orchestrator)

## Sprint A — Foundation & Data Plane (`sprint/a-foundation`) — active
- Lane brief: `project/lane-a/BRIEF.md` (read-only for agents).
- Contracts: frozen interface surface committed by coordinator (`packages/shared`, `packages/db` interfaces).

### SA1 — Implement `@isolate/shared`
- Owner: agent session `task/sa1-shared` · Worktree: `../worktrees/sa1-shared` · Branch: `task/sa1-shared`
- File ownership: `packages/shared/**` only.
- Dependencies: none (contracts pre-committed).
- Acceptance criteria + DoD: brief §Task A1 — new schemas + deep-redaction compile, scoped gates green (biome/tsc/bun test), per-file challenge notes in final report, no files outside ownership touched.
- Status: in progress

### SA2 — Implement `@isolate/db`
- Owner: agent session `task/sa2-db` · Worktree: `../worktrees/sa2-db` · Branch: `task/sa2-db`
- File ownership: `packages/db/**` only.
- Dependencies: SA1 contracts (frozen, already on branch).
- Acceptance criteria + DoD: brief §Task A2 — migration 0002 + all six repositories + atomic-claim queue semantics + payload-bound approvals, tests skip-clean without DATABASE_URL, scoped gates green.
- Status: in progress

## Sprint B — Runtime & Orchestration Plane (`sprint/b-runtime`) — active
- Lane brief: `project/lane-b/BRIEF.md`.
- Concurrent-dependency rule: B lane compiles against packages/db INTERFACES ONLY; no concrete @isolate/db implementations exist on these branches yet.

### SB1 — Durable worker loop (`apps/worker`)
- Owner: agent session `task/sb1-worker` · Worktree: `../worktrees/sb1-worker` · Branch: `task/sb1-worker`
- File ownership: `apps/worker/src/**` only.
- DoD: brief §Task B1 (claim/heartbeat/ack/fail lifecycle + reapers + graceful stop + in-memory queue tests).
- Status: in progress

### SB2 — Mastra SDLC workflow + agent (`packages/mastra`)
- Owner: agent session `task/sb2-mastra` · Worktree: `../worktrees/sb2-mastra` · Branch: `task/sb2-mastra`
- File ownership: `packages/mastra/src/**` only.
- DoD: brief §Task B2 (installed-d.ts verification, bounded workflow with suspend/resume + repair budget, policy-gated tools, fake model tests).
- Status: in progress

### SB3 — Workflow registry/validation/compiler (`packages/workflow-schema`)
- Owner: agent session `task/sb3-wf-schema` · Worktree: `../worktrees/sb3-wf-schema` · Branch: `task/sb3-wf-schema`
- File ownership: `packages/workflow-schema/src/**` only.
- DoD: brief §Task B3 (per-type Zod configs, full validator, deterministic compiler, no dynamic codegen, tests).
- Status: in progress

### SB4 — GitHub connector foundations (`packages/integrations`)
- Owner: agent session `task/sb4-integrations` · Worktree: `../worktrees/sb4-integrations` · Branch: `task/sb4-integrations`
- File ownership: `packages/integrations/src/**` only.
- DoD: brief §Task B4 (fetch-based PR creator, redaction test, audit dependency injection, mocked tests).
- Status: in progress

## Wave 2 — Integration & validation (coordinator, after both lanes report done)
- Merge `task/*` → `sprint/a-foundation` + `sprint/b-runtime` → `main` via integration worktree; resolve conflicts centrally; run full `bun run validate` + integration DoD audit; apply migration 0002 to Neon; spawn QA validation agent; update ARCHITECTURE/STATUS/CHALLENGES; verify CI green on the pushed commit.
- Status: planned

## Next (post-wave-2, not in scope)
- Visual workflow editor UI (phase 6), sandbox execution plane (phase 5), auth/tenancy (phase 7) — see ARCHITECTURE.md.
