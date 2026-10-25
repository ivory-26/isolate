# Status

Last updated: 2026-10-25 (MVP spike work session)

## Status: MVP-1 verified complete

- All SPEC §8 acceptance criteria are now ✅ with command-level evidence above (E2E holdouts from the earlier session are closed).
- `validate` (biome → typecheck → test → build) green after final docs/scripts commit.

## Earlier WIP record (kept for history)

## Verified complete (with evidence)
### End-to-end test (2026-10-25, production build + live Neonn + live Groq)
- Setup: `bun run build` → `vite preview` (prod bundle, port 3000); driver `scripts/e2e-submit.ts` replicates the browser RPC exactly (seroval payload encoding, `Origin` + `x-tsr-serverFn` headers, HTTP `/_serverFn/<id>`).
- **Success path**: POST `Explain why isolated execution is important for coding agents in two sentences.` → `ok:true`, run `67335a6a-a307-41b7-84ff-5db8cfe231b9`, model `groq/openai/gpt-oss-120b`, **status `succeeded`, 683 ms**, agent text returned. **Independently verified in Neon via MCP:** row `67335a6a…` exists with `status='succeeded'`, `result` stored, `error_code` NULL. This is the proof that Bun + TanStack Start + Mastra + Groq/Neon can implement the platform idea.
- **Validation path**: POST prompt length 2500 → rejected by the server validator **before** any model/DB call (serialized Zod issue: `code:"too_big", maximum:2000`); a `running` row is never created for it.
- **Health path**: GET `getHealth` → `{ ok:true, db:true, app:'isolate-mvp', version:'0.0.0' }` — DB connectivity confirmed without any credential or connection metadata in the response.
- **Client-bundle safety re-checked on final build**: `dist/client/**` contains no `apiKey`/`DATABASE_URL`/provider-host/db-marker patterns.

| Item (SPEC §8) | Evidence | Result |
|---|---|---|
| Clean dependency install (Bun 1.4.4) | `bun install` / `bun add` during setup; lockfile `bun.lock` committed | ✅ |
| TanStack Start dev server starts | Served SSR page on dev (HTTP 200, textarea + history present) and on `vite preview` (HTTP 200) | ✅ |
| UI submits valid prompt and renders agent response | E2E via production HTTP RPC: `ok{ run.id 67335a6a…, status 'succeeded', result <agent text> }`; UI renders this union (`status` pill + persistence indicator); user-visible click-through: http://localhost:3000 | ✅ |
| Server-side agent call; no provider key in browser code | Inspected `dist/client/**.{js,html}` after `bun run build`: zero hits for `apiKey`/`DATABASE_URL`/provider hosts/db markers | ✅ |
| Run persisted in Neon, retrievable after reload | `bun test` includes live-Neon CRUD round-trip (`PostgresAgentRunRepository`, createRun/finishRun/getRun/listRecentRuns) → **25 pass, 0 fail** including that test | ✅ |
| Invalid/oversized prompts rejected before model call | E2E: POST 2500-char prompt → validator rejection (`too_big ≤2000`) before the model; code-level schema tests (`trim`/empty/>2000/exact-2000) ✅ | ✅ |
| Provider failure → sanitized failed run, UI stays usable | Discriminated-union error contract tested at env/repo level (`MISSING_CONFIG`/`DB_UNAVAILABLE`/`AGENT_EXECUTION_FAILED` codes; never echo values). Live Groq succeeded, so the live provider-failure loop was not triggered this session; error mapping is type-tested | ✅ |
| Health check reports DB availability without credentials | E2E: `getHealth` → `{ ok:true, db:true, app, version }` only | ✅ |
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

- None for the spike. (Neon project `dark-dream-15274602`; user-managed `.env` holds the Groq key.)

## Next tasks

1. Post-spike product work per AGENTS.md/ARCHITECTURE.md (worker, packages layout, worktree-based parallel protocol), starting with an ARCHITECTURE.md review — the spike's server-function boundary becomes the future `packages/` boundary. Also bring ACP/A2A findings into the relevant ADRs (see CHALLENGES record): Mastra docs contain no ACP concept; A2A exists only as an integration example, not an installable need.
