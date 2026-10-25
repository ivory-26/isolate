# Status

Last updated: 2026-10-25 (MVP spike work session)

## Current WIP

- **MVP-1 (SPEC.md compatibility spike) — integration complete, pending user-supplied Groq key for the live agent round-trip.**
- Orchestrator completed scaffold, contracts, Neon provisioning, integration fixes, docs. Two parallel subagents (backend / UI) landed their owned files; integration gate passed after one contract bugfix.

## Verified complete (with evidence)

| Item (SPEC §8) | Evidence | Result |
|---|---|---|
| Clean dependency install (Bun 1.4.4) | `bun install` / `bun add` during setup; lockfile `bun.lock` committed | ✅ |
| TanStack Start dev server starts | `bun run dev` pending final E2E spin-up (build proof below); see E2E section when closed | ⏳ E2E |
| UI submits valid prompt and renders agent response | Requires provider key — pending user `LLM_API_KEY` in `.env` | ⏳ |
| Server-side agent call; no provider key in browser code | Inspected `dist/client/**.{js,html}` after `bun run build`: zero hits for `apiKey`/`DATABASE_URL`/provider hosts/db markers | ✅ |
| Run persisted in Neon, retrievable after reload | `bun test` includes live-Neon CRUD round-trip (`PostgresAgentRunRepository`, createRun/finishRun/getRun/listRecentRuns) → **25 pass, 0 fail** including that test | ✅ |
| Invalid/oversized prompts rejected before model call | Runtime schema + UI guard tests (`agentRunInputSchema` trim/empty/>2000/exact-2000) ✅; E2E curl rejection pending in E2E section | ✅ code / ⏳ E2E |
| Provider failure → sanitized failed run, UI stays usable | Discriminated-union error contract tested at env/repo level (`MISSING_CONFIG`/`DB_UNAVAILABLE`/`AGENT_EXECUTION_FAILED` codes; never echo values) | ✅ code / ⏳ E2E |
| Health check reports DB availability without credentials | `getHealth` returns `{ ok, db, app, version }` only; code-reviewed + typecheck | ✅ / ⏳ E2E |
| Typecheck, lint, tests, build pass | `bun run typecheck` ✅ 0 errors · `bunx biome check .` ✅ (14 files) · `bun test` ✅ 25 pass/0 fail/75 expect · `bun run build` ✅ 68 modules, `dist/client` + `dist/server`, 505 ms | ✅ |
| `.env.example` has no real credentials | Reviewed — placeholder names/values only | ✅ |
| README setup/migration/env/commands/troubleshooting | Rewritten 2026-10-25 with real scaffold commands + Neon troubleshooting table | ✅ |
| `project/STATUS.md` | This file | ✅ |
| `project/DECISIONS.md` versions/provider/driver/why | Scaffold versions; Mastra `OpenAICompatibleConfig` model form (verified against installed types); postgres.js; bun test rationale | ✅ |
| `project/CHALLENGES.md` failures + fixes | PowerShell scaffold merge loss; Mastra docs drift; contract fix `status DEFAULT 'running'` to be appended below when E2E closes | ✅ |

Commands executed this session (orchestrator): `bun install` ✅ · `bun add @mastra/core zod postgres` ✅ · `bun run generate-routes` ✅ · `bun run typecheck` ✅ (final) · `bun test` ✅ 25/0 · `bunx biome check .` ✅ final · `bun run build` ✅.

## Subagent work

- UI agent: `src/routes/index.tsx` (input, loading/error/success states, run ID + status + persistence indicator, history newest-first, DB health indicator), `__root.tsx` title. All its gates green; no contract changes needed.
- Backend agent: `src/server/{env,db,agent,run-repository,functions}.ts`, `db/migrations/0001_agent_smoke_test_runs.sql`, `env.test.ts` + `types-contract.test.ts` (24 tests pre-integration). Integration fixes (orchestrator): added `bun-types` and removed the temporary `bun:test` shim from `tests/`; schema default `status DEFAULT 'running'` aligned between migration, live Neon table, and repository INSERT (contract bug found by the real-Neon integration test); dropped unused test param for strict typecheck.

## Blockers / pending user input

- ❗ Live agent round-trip E2E requires the user to put their Groq key in `.env` as `LLM_API_KEY=`. Orchestrator must not read/print `.env` files.

## Next tasks

1. E2E: start dev server → SSR page load → submit prompt via the server-function endpoint → confirm `succeeded` row in Neon via MCP → also verify rejection path (>2000 chars → `VALIDATION_FAILED`, no run row).
2. Confirm A2A/ACP unnecessary; keep `@mastra/pg` evaluation as post-spike decision item.
3. Then start the full platform work per AGENTS.md/ARCHITECTURE.md (worker, packages layout, worktree protocol).
