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
- [ ] MVP-1c Backend implementation (backend agent)
- [ ] MVP-1d UI page (UI agent)
- [ ] MVP-1e Integration validation: generate-routes, typecheck, lint, bun test, build (orchestrator)
- [ ] MVP-1f End-to-end smoke with real provider key (user-assisted: needs LLM_API_KEY in .env)
- [ ] MVP-1g Docs handoff: README commands/troubleshooting, STATUS.md evidence (orchestrator)

## Next (post-spike, not in scope)
- Desktop/worker split, sandbox integration, GitHub integration, workflow editor — see ARCHITECTURE.md; start only after MVP-1 passes or blockers are documented.
