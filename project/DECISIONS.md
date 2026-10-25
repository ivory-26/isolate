# Decisions log

Dated, one entry per decision. Format: date — decision — rationale — alternatives rejected.

## 2026-10-25 — MVP spike scope fixed by SPEC.md
- Decision: implement only the compatibility spike in `SPEC.md` (one Mastra agent call, one persisted run row, one TanStack page, health check, tests). Everything in the spec's "Explicitly out of scope" section stays out.
- Rationale: prove Bun + TanStack Start + Mastra + Neon work together before any product architecture.

## 2026-10-25 — Scaffold and framework versions
- Decision: scaffold with `bunx @tanstack/cli@latest create` (non-interactive, Biome toolchain, Tailwind 4, no example pages). Base versions verified together: TanStack Start `@tanstack/react-start@1.169.4`, React 19.3.1, Vite 8.3.5, TypeScript 6.0.3, Biome 2.4.5, Tailwind 4.3.3.
- Rationale: versions came from a fresh scaffold run on Bun 1.4.4 rather than tutorial assumptions.
- Alternative rejected: manual "build from scratch" setup — unnecessary risk/effort for a spike.

## 2026-10-25 — Single app at repo root for the MVP (not apps/web monorepo)
- Decision: the TanStack Start app lives at the repo root (`src/…`) with server code under `src/server/`. AGENTS.md's monorepo layout (`apps/web`, `packages/*`) is deferred to post-spike work.
- Rationale: SPEC.md mandates the smallest vertical slice; a monorepo adds workspace overhead with zero spike value. Layout stays compatible because the app boundary (`src/server` server-only) is the same that would later become `packages/`.

## 2026-10-25 — Model provider: OpenAI-compatible gateway (OpenRouter / Groq)
- Decision: use `@mastra/core`'s built-in OpenAI-compatible model config: `model: { id: \`${MODEL_PROVIDER}/${LLM_MODEL}\`, url, apiKey }` validated against installed `@mastra/core@1.79.0` types (`OpenAICompatibleConfig` in `dist/llm/model/shared.types.d.ts`). Default base URLs: OpenRouter `https://openrouter.ai/api/v1`, Groq `https://api.groq.com/openai/v1`; `LLM_BASE_URL` overrides.
- Rationale: user requested OpenRouter/Groq; this requires no extra provider package and stays provider-agnostic via env vars (`MODEL_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`).
- Alternative rejected: `@mastra/openai` package — not needed for a custom base URL.

## 2026-10-25 — Database: Neon PostgreSQL with postgres.js, plain SQL migration
- Decision: driver `postgres@3.4.9` (postgres.js) against the Neon pooled connection string; schema in `db/migrations/0001_agent_smoke_test_runs.sql`, applied with `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` so it is safe to re-run. The spike does NOT register a Mastra storage adapter — persistence is our own `agent_smoke_test_runs` table per SPEC.md §5.
- Rationale: postgres.js works in Bun with no WebSocket driver dependency; Natron–Neon pooled endpoints suit short-lived server functions. A Mastra storage adapter is unnecessary because the spike requires only our run records, and adding storage would violate "smallest vertical slice".
- Open item for post-spike: evaluate `@mastra/pg` when the product needs Mastra-native memory/workflow persistence.

## 2026-10-25 — Test runner: `bun test` instead of Vitest
- Decision: use Bun's built-in test runner (`bun test`, `bun:test`).
- Rationale: Vitest compatibility with Vite 8.3.5 was unverified at scaffold time and installing it speculatively risked peer-dependency churn; `bun test` is zero-config and runs the spike's validation/repository tests on Bun 1.4.4. SPEC.md §3 allows "the test runner supported by the chosen scaffold".
- Open item: revisit Vitest once Vitest officially pairs with Vite 8 (needed only if browser-mode component tests become necessary).

## 2026-10-25 — Response contract: discriminated unions, sanitized error codes
- Decision: `POST`-style server function `submitAgentRun` returns `{ ok: true, run } | { ok: false, code, message }` instead of throwing; failures carry only short codes (`VALIDATION_FAILED`, `MISSING_CONFIG`, `AGENT_EXECUTION_FAILED`, `DB_UNAVAILABLE`, `RATE_LIMITED`, `NOT_FOUND`, `INTERNAL`) plus safe messages. The same codes are stored in `error_code`.
- Rationale: satisfies SPEC.md §6/§8 (no stacks, no provider payloads, no connection strings on the wire) and keeps the UI free of provider-specific error parsing.

## 2026-10-25 — Subagent coordination via typed contracts, not worktrees
- Decision: because the spike is one small greenfield commit series in a fresh repo, parallel agents were given non-overlapping file ownership around pre-written typed contracts (`src/server/types.ts` = shared types, `src/server/run-repository.ts` = repository interface, `src/server/functions.ts` = server function signatures) instead of git worktrees.
- Rationale: worktrees isolate concurrent edits but complicate a single-package greenfield MVP; typed ownership boundaries achieve the same anti-deadlock goal. AGENTS.md worktree protocol applies to post-MVP parallel feature work.
