# Isolate — Agent Platform (MVP spike)

A model-agnostic engineering automation platform that accepts a software task, inspects a repository, plans and implements a change in an isolated cloud sandbox, runs tests and security checks, and prepares a reviewable GitHub pull request. Users can customize workflows visually and connect approved tools, MCP servers, skills, and business-specific actions.

This repository currently contains the **MVP compatibility spike** defined in `SPEC.md`: one server-side Mastra agent call (OpenRouter/Groq), one persisted run record in Neon PostgreSQL, a minimal TanStack Start page, and a health check. The full architecture is described in [`ARCHITECTURE.md`](ARCHITECTURE.md) and comes only after this spike passes.

## What the spike proves

- **Bun + TanStack Start + Mastra + Neon PostgreSQL work together** on one machine.
- A server-only `submitAgentRun` server function validates input (Zod), rate-limits (per-process sliding window), writes a `running` row to Neon, executes a Mastra agent (Groq or OpenRouter via the OpenAI-compatible model config), and writes a terminal status (`succeeded`/`failed`) with a sanitized error code.
- The browser never sees provider keys, database credentials, stacks, or raw provider errors — only `{ ok, run }` / `{ ok: false, code, message }`.
- Key files:
  - `src/server/functions.ts` — the three server functions (`submitAgentRun`, `getRecentRuns`, `getHealth`)
  - `src/server/agent.ts` — Mastra agent (`@mastra/core@1.79.0`, OpenAI-compatible model object)
  - `src/server/db.ts` + `src/server/run-repository.ts` — postgres.js client + repository
  - `db/migrations/0001_agent_smoke_test_runs.sql` — table + index (idempotent)
  - `src/routes/index.tsx` — UI (input, loading/error states, result + run ID + status, history, DB indicator)

## Quickstart

### Prerequisites
- Bun 1.4+ (`bun --version`)
- A Neon PostgreSQL database (free tier is fine)
- An OpenRouter **or** Groq API key

### 1. Install

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env` (this file is git-ignored; never commit it):

```ini
DATABASE_URL=postgresql://<user>:<password>@<host-pooler>/<db>?sslmode=require
MODEL_PROVIDER=groq            # groq | openrouter
LLM_API_KEY=<your key>         # never leave real or fake keys in docs
LLM_BASE_URL=                  # optional; sensible defaults per provider
LLM_MODEL=llama-3.3-70b-versatile  # groq example; for openrouter try meta-llama/llama-3.3-70b-instruct
APP_BASE_URL=http://localhost:3000
```

The pooled (`-pooler`) connection string from the Neon dashboard is recommended for local dev. Missing values fail **lazily and safely** — the app reports the missing variable *name* only, never its value.

### 3. Create the table

The schema is one idempotent script — run it once against your database:

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

## What is intentionally out of scope

Per `SPEC.md`: no sandboxes/VMs, no Git/GitHub integration, no multi-agent coordination, no visual workflow builder, no MCP marketplace, no RAG/embeddings/memory, no auth/multi-tenancy/billing, no Mastra storage adapter (a `@mastra/pg` evaluation is a post-spike item — see `project/DECISIONS.md`), no unbounded loops.

## Documentation

- [SPEC — this MVP's contract](SPEC.md)
- [Architecture (target system)](ARCHITECTURE.md)
- [Agent instructions](AGENTS.md)
- [Skills inventory](SKILLS.md)
- [Task queue & ownership](project/TASKS.md)
- [Current status + validation evidence](project/STATUS.md)
- [Decisions](project/DECISIONS.md) · [Challenges](project/CHALLENGES.md)
