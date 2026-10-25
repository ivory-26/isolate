# MVP Spec: Agent Platform Compatibility Spike

## 1. Objective

Build a small, disposable proof of concept to verify that **Bun + TanStack Start + Mastra + Neon PostgreSQL** work together before starting the full hackathon product.

This is a compatibility spike, not the production platform. It must demonstrate one server-side Mastra agent call, one persisted run record in Neon, and a minimal TanStack page that triggers the call and displays its result.

## 2. Scope

### Must have
- A TanStack Start app using React and TypeScript, running with Bun.
- One server-only endpoint/server function that invokes a Mastra agent.
- One Mastra agent configured with a single model provider supported by the current Mastra version.
- A Neon PostgreSQL connection and a minimal table to persist each test run.
- A simple page with:
  - a text input for a prompt,
  - a submit button,
  - loading and error states,
  - the returned agent text,
  - a run ID and persistence status.
- A health/status check that verifies database connectivity without exposing connection details.
- Tests for input validation, database repository behavior where practical, and the main request path.
- `.env.example` containing placeholder variable names only.
- A README section with exact setup, development, test, and troubleshooting commands.

### Explicitly out of scope
- Cloud sandbox or VM provisioning.
- Git clone/worktree operations.
- GitHub integration or pull-request creation.
- Multi-agent coordination.
- Visual workflow builder.
- MCP server marketplace or arbitrary custom skills.
- RAG, embeddings, long-term agent memory, and vector search.
- Production authentication, multi-tenancy, billing, deployment, or autoscaling.
- Unbounded retries or autonomous self-modification.

## 3. Proposed stack

- Runtime/package manager: Bun.
- Compatibility runtime: Node.js 22 LTS for tools that require Node.
- Web: TanStack Start, React, TypeScript.
- Agent: Mastra.
- Database: Neon PostgreSQL.
- Validation: Zod.
- Testing: use the test runner supported by the chosen scaffold; prefer Vitest if compatible.
- Styling: use the scaffold's existing styling or minimal CSS; avoid spending time on design systems.

Before implementation, verify current official documentation and compatible package versions. Do not assume a package name, CLI flag, storage adapter, or TanStack/Mastra integration exists without checking. Prefer framework-neutral server-side Mastra imports unless an official, maintained TanStack-specific integration is verified.

## 4. Minimal user flow

1. Developer opens the local web app.
2. Developer enters a short prompt such as: `Explain why isolated execution is important for coding agents in two sentences.`
3. The page submits the prompt to a server-only handler.
4. The handler validates the input and creates a run record with status `running`.
5. The Mastra agent executes on the server using the configured model provider.
6. The result or a sanitized error is saved to Neon with a terminal status.
7. The page displays the result, run ID, and status.
8. A history section or a simple server-side lookup shows recent runs, newest first.

## 5. Data model

Create one table, for example `agent_smoke_test_runs`, with:
- `id`: UUID primary key.
- `prompt`: text, with a strict maximum length.
- `status`: constrained text/enum: `running`, `succeeded`, `failed`.
- `result`: nullable text.
- `error_code`: nullable short, non-sensitive error code.
- `created_at`: timestamp with timezone.
- `finished_at`: nullable timestamp with timezone.
- `duration_ms`: nullable integer.

Do not persist provider secrets, raw credentials, or full unredacted provider error objects. Store a safe error code/message only. Include a migration or clearly documented SQL setup script.

## 6. API and validation

Implement a server-only operation equivalent to:
- `POST /api/agent-run` or a TanStack Start server function.
- Input: `{ "prompt": string }`.
- Validate prompt is non-empty after trimming and within a reasonable limit, e.g. 2,000 characters.
- Return a stable shape containing `runId`, `status`, and `result` on success.
- Return a safe error response on failure; do not expose stack traces, environment values, provider payloads, or database connection strings.
- Add basic rate/size protection appropriate for a local spike. Do not build a full rate-limiting system.

## 7. Configuration

Create `.env.example` with placeholder names such as:
- `DATABASE_URL=`
- `MODEL_PROVIDER=`
- provider-specific API key variable for the selected provider
- `APP_BASE_URL=http://localhost:3000`

Use the actual variable names selected by the implementation. Read environment variables only in server-only modules. Never read, print, modify, or commit an existing `.env*` file or real secrets. If a required variable is missing, fail with a clear, sanitized setup message.

## 8. Acceptance criteria

The spike is complete only when all of the following are verified:

- [ ] A clean dependency install succeeds with Bun.
- [ ] The TanStack Start dev server starts using the documented command.
- [ ] The UI can submit a valid prompt and render the agent response.
- [ ] The agent call happens server-side; no provider API key appears in browser code or network responses.
- [ ] A successful run is persisted in Neon and can be retrieved after a page reload.
- [ ] Invalid and oversized prompts are rejected before calling the model.
- [ ] A provider failure is stored as a failed run with a sanitized error; the UI remains usable.
- [ ] The health/status check reports database availability without leaking credentials.
- [ ] Typecheck, lint, tests, and production build pass.
- [ ] `.env.example` contains no real credentials.
- [ ] README documents setup, migration, environment configuration, run/test/build commands, and common failures.
- [ ] `project/STATUS.md` records what was actually tested and any remaining blockers.
- [ ] `project/DECISIONS.md` records chosen package versions, model provider, Neon driver/ORM, and why.
- [ ] `project/CHALLENGES.md` records any meaningful failed approaches and their fixes.

## 9. Validation commands

Use only scripts that exist in `package.json`. Establish these root commands where practical:
```bash
bun install
bun run dev
bun run test
bun run typecheck
bun run lint
bun run build
bun run validate
```

`validate` should run the relevant automated checks and exit non-zero on failure. Record the exact commands and actual outcomes; do not claim checks passed without running them.

## 10. Implementation protocol for the agent

1. Read `AGENTS.md`, `README.md`, `ARCHITECTURE.md`, `SKILLS.md`, and `project/STATUS.md` if these files exist.
2. Inspect the existing repository and scaffold. Do not overwrite existing work or assume a blank repo.
3. Verify current official docs for Bun, TanStack Start, Mastra, and Neon compatibility before choosing versions or adapters.
4. Write a short implementation plan and list assumptions before editing.
5. Implement the smallest vertical slice; avoid abstractions not needed for this test.
6. Keep provider and database code server-only.
7. Run validation and record exact outcomes.
8. Update docs and project logs. Report any checks that could not be run and why.
9. Do not proceed to the full product architecture until this spike passes or its blockers are explicitly documented.

## 11. Definition of Done

A reviewer can clone the repository, configure their own Neon database and model-provider key, follow the README, start the app, submit a prompt, see the agent response, and verify the run is stored in Neon. All available automated checks pass, secrets remain server-side, and the final handoff includes a concise list of tested versions, commands, outcomes, and unresolved compatibility issues.
