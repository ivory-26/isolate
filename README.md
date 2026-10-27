# Isolate — Autonomous DevSecOps Agent Platform

A model-agnostic engineering automation platform that accepts a software task, inspects a repository, plans and implements a change in an isolated cloud sandbox, runs tests and security checks, and prepares a reviewable GitHub pull request. Users can customize workflows visually and connect approved tools, MCP servers, skills, and business-specific actions.

**Stack**: Bun · TypeScript · TanStack Start/Router · React 19 · Mastra (`@mastra/core`) · Neon PostgreSQL · Zod · Biome · Bun test · Groq/OpenRouter (OpenAI-compatible gateways)

---

## What is already built (pre-hackathon MVP spike — verified Oct 25, 2026)

The first deliverable was the compatibility spike from [`SPEC.md`](SPEC.md). It is **complete and verified end-to-end** — all §8 acceptance criteria hold with command-level evidence recorded in [`project/STATUS.md`](project/STATUS.md). It proves the four core technologies work together before any product architecture was written.

### Feature inventory (all verified)

| Capability | Implementation | Evidence |
|---|---|---|
| TanStack Start app on Bun | Scaffolded via `@tanstack/cli`, React 19, Vite 8, Tailwind 4, strict TS, Biome; runs in dev and production builds | All validation gates green |
| Server-only Mastra agent call | `src/server/agent.ts` — `@mastra/core@1.79.0` Agent with OpenAI-compatible model object `{ id, url, apiKey }`; supports **Groq** and **OpenRouter** | E2E: real prompt → `succeeded` in 683 ms via `groq/openai/gpt-oss-120b` |
| Persisted runs in Neon | `agent_smoke_test_runs` table (idempotent `db/migrations/0001_agent_smoke_test_runs.sql`), repository layer `src/server/run-repository.ts` over `postgres.js` | E2E row verified three ways: HTTP response, `SELECT` via Neon, UI history after reload |
| End-user page | `src/routes/index.tsx`: prompt input with client-side guard, loading/error states, agent result, run ID + status pill + "Saved to Postgres" indicator, newest-first history, DB health indicator | SSR + production HTTP verified |
| Input validation & protection | Zod schema (trim, 1–2000 chars) **before** any model/DB call; basic per-process rate limit (10 req/min) | E2E: 2500-char prompt rejected pre-model; oversized/empty rules unit-tested |
| Safe error contract | Discriminated union responses `{ ok, run } / { ok, code, message }` with bounded codes (`VALIDATION_FAILED`, `MISSING_CONFIG`, `AGENT_EXECUTION_FAILED`, `DB_UNAVAILABLE`, `RATE_LIMITED`, `INTERNAL`); secrets, stacks, and provider payloads never reach the browser or the database | Contract tests; client bundle scanned clean |
| Health check | `getHealth` → `{ ok, db, app, version }` with no credentials or connection metadata | E2E verified |
| Persistence visibility | `getRecentRuns` history endpoint, newest first | E2E verified with live Neon rows |
| Automated checks | `bun run validate` = Biome → typecheck → `bun test` (25 tests incl. live-Neon CRUD integration) → production build | All green; outcomes logged |
| Security posture | Server-only env/db/repo/agent modules, sanitized setup errors (variable *names* only), no secret reading/printing | Code audit + bundle scan |

### Key facts recorded during the spike
- Versions verified together: TanStack Start 1.169.4, `@mastra/core` 1.79.0, zod 4.6.7, postgres 3.4.9, Vite 8.3.5, TS 6.0.3, Biome 2.4.5, Bun 1.4.4.
- Decisions (with rationale) live in [`project/DECISIONS.md`](project/DECISIONS.md); failures/lessons (PowerShell scaffold-loss, Mastra docs drift, the `status DEFAULT 'running'` contract bug, Neon cold-start, server-function E2E quirks, ACP/A2A fact-check) in [`project/CHALLENGES.md`](project/CHALLENGES.md).
- ACP/A2A/extra Mastra SDK packages fact-checked with the Mastra docs MCP: **not needed** — multi-agent coordination is native to `@mastra/core` (Agent Networks/Workflows). Revisit only via a documented ADR.

---

## What we build next (from today — the real platform)

The platform proper follows [`ARCHITECTURE.md`](ARCHITECTURE.md). Nothing below exists yet; work starts now and this section becomes the build log.

| Phase | Build target (architecture boundary) | Status |
|---|---|---|
| 1 | Monorepo layout: move the spike's `src/server` boundary into `packages/` (`db`, `mastra`, `shared`), add `apps/worker` durable task consumer | ✅ planned |
| 2 | Full Neon data model: orgs/users/memberships, repositories, workflow definitions/versions, tasks/attempts/runs, events, artifacts, approvals, audit/usage records | ✅ planned |
| 3 | Mastra SDLC workflow (bounded state machine: `queued → planning → executing → validating → repair → review → PR`) with bounded retries and explicit stop conditions | ✅ planned |
| 4 | Typed tools + GitHub connector (least-privilege, PR creation, approval gating) — **credible end-to-end first workflow** | ✅ planned |
| 5 | Disposable cloud sandbox execution plane (Git clone/branch inside sandbox, command policy, timeouts, cleanup) | ✅ planned |
| 6 | Visual workflow editor (versioned JSON graph schema → compiler → Mastra runs, version-pinned) | ✅ planned |
| 7 | Production security: auth, tenancy, approvals, audit, secret hygiene, prompt-injection defense | ✅ planned |

The MVP artifacts remain the seed of phases 1–4: `submitAgentRun`'s validate→persist→agent→terminate loop is the skeleton of the task execution lifecycle; `src/server/db.ts` grows into `packages/db`; `src/server/agent.ts` grows into `packages/mastra/agents`.

---

## MVP quickstart (still current)

### Prerequisites
- Bun 1.4+ (`bun --version`)
- A Neon PostgreSQL database (free tier is fine)
- A Groq or OpenRouter API key

### 1. Install

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` (git-ignored; never commit it):

```ini
DATABASE_URL=postgresql://<user>:<password>@<host-pooler>/<db>?sslmode=require
MODEL_PROVIDER=groq            # groq | openrouter
LLM_API_KEY=<your key>
LLM_BASE_URL=                  # optional; provider defaults: groq -> https://api.groq.com/openai/v1, openrouter -> https://openrouter.ai/api/v1
LLM_MODEL=openai/gpt-oss-120b  # groq example (note the openai/ prefix); for openrouter try meta-llama/llama-3.3-70b-instruct
APP_BASE_URL=http://localhost:3000
```

The pooled (`-pooler`) connection string from the Neon dashboard is recommended for local dev. Missing values fail **lazily and safely** — the app reports the missing variable *name* only, never its value.

### 3. Create the table

```bash
psql "$DATABASE_URL" -f db/migrations/0001_agent_smoke_test_runs.sql
```

or paste the file into the Neon SQL console. Re-running it is a no-op (`IF NOT EXISTS`). (`gen_random_uuid()` is built in on Postgres 13+; for 12 run `CREATE EXTENSION IF NOT EXISTS pgcrypto;` first.)

### 4. Run the app

```bash
bun run dev
```

Open http://localhost:3000, enter a prompt (e.g. `Explain why isolated execution is important for coding agents in two sentences.`), submit, and you should see the agent answer, a run ID, a status pill, and "Saved to Postgres". Reload the page — the run is in the history list (newest first).

### Regenerating routes after file-based route changes

```bash
bun run generate-routes
```

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | TanStack Start dev server on port 3000 |
| `bun run test` | Bun's test runner (unit + contract + optional live-Neon integration tests) |
| `bun run typecheck` | `tsc --noEmit` (strict) |
| `bun run lint` | Biome lint |
| `bun run format` | Biome format |
| `bun run check` | Biome check (lint + format) |
| `bun run build` | Production build to `dist/client` + `dist/server` |
| `bun run validate` | All gates: biome check → typecheck → test → build |

The repository's own integration test (SQL CRUD round-trip) runs automatically in `bun test` **when `DATABASE_URL` is set**; without it, that test is skipped and 24 unit/contract tests still run.

## Verifying persistence

```sql
SELECT id, status, error_code, created_at, finished_at, duration_ms
FROM agent_smoke_test_runs
ORDER BY created_at DESC
LIMIT 10;
```

(Free-tier Neon computes auto-suspend; the first connection after idle may fail once — retry.)

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `MISSING_CONFIG`-style error naming a variable (name only) | `.env` incomplete | Fill the named variable and retry |
| `DB_UNAVAILABLE` in the UI, DB indicator red | Wrong/misspelled `DATABASE_URL`, firewall, or cold Neon compute | Re-check the pooled URL; retry once after a cold start |
| `AGENT_EXECUTION_FAILED` | Provider rejected the model name or key | Verify `LLM_MODEL` exists for your provider and `LLM_API_KEY` is valid; check the run row's `error_code` |
| `RATE_LIMITED` | More than 10 submissions in a rolling minute (single process) | Wait ~60s |
| First `bun test` Neon test fails with a socket error | Neon compute cold start mid-connection | Re-run `bun test` |
| `bun run typecheck` errors after adding routes | Stale `routeTree.gen.ts` | `bun run generate-routes` |

## What is deliberately NOT in the built MVP (and why)

Everything in [`SPEC.md`](SPEC.md)'s out-of-scope list was excluded intentionally: sandboxes/VMs, Git/GitHub integration, multi-agent coordination, visual workflow builder, MCP marketplace, RAG/embeddings/memory, auth/multi-tenancy/billing, and a Mastra storage adapter (`@mastra/pg` evaluation is a phase-1+ decision item). These are the platform's roadmap, not omissions — see the phase table above.

## Documentation

- [SPEC — the built MVP's contract](SPEC.md)
- [Architecture — the platform we build next](ARCHITECTURE.md)
- [Agent instructions](AGENTS.md)
- [Skills inventory](SKILLS.md)
- [Task queue & ownership](project/TASKS.md)
- [Current status + validation evidence](project/STATUS.md)
- [Decisions](project/DECISIONS.md) · [Challenges](project/CHALLENGES.md)
