# Autonomous DevSecOps Agent Platform

A model-agnostic engineering automation platform that accepts a software task, inspects a repository, plans and implements a change in an isolated cloud sandbox, runs tests and security checks, and prepares a reviewable GitHub pull request. Users can customize workflows visually and connect approved tools, MCP servers, skills, and business-specific actions.

**Current architectural direction:** Bun + TypeScript, TanStack Start/Router/Query, Mastra agents and workflows, Neon PostgreSQL, a separate worker, and disposable cloud sandboxes. The initial product must prove one reliable end-to-end SDLC workflow before expanding the integration marketplace or multi-agent features.

## Core goals
- Execute engineering tasks outside the web server in isolated environments.
- Keep model providers replaceable behind a provider configuration/adapter boundary.
- Use explicit workflows for planning, implementation, testing, review, approval, and pull-request creation.
- Provide auditable runs, bounded retries, policy enforcement, and human approval for privileged actions.
- Let users build versioned workflows with a visual editor.
- Support controlled integrations through typed tools, native connectors, and MCP.

## Quickstart

### Prerequisites
- Bun 1.x
- Node.js 22 LTS available for compatibility with tools that require Node
- Git
- A Neon PostgreSQL database
- A model-provider API key
- A GitHub App or appropriately scoped GitHub credentials for development
- A sandbox provider account/configuration

### Bootstrap
Use the TanStack Start starter and add Mastra to the project. Confirm current CLI syntax against the official docs before running it, because generator options and package versions change.

```bash
# Create the TanStack Start application using the current official starter instructions.
bun create @tanstack/start

cd <created-project>

# Add core runtime dependencies. Pin compatible versions after validating them together.
bun add @mastra/core @mastra/libsql zod
bun add @tanstack/react-query
bun add -d mastra typescript
```

The database adapter shown above is an example, not the final Neon adapter choice. Before implementation, select and document the supported Mastra storage adapter and configure it for Neon/PostgreSQL. Do not add a second database just because a tutorial uses a different storage backend.

If the current TanStack Start generator produces a different folder structure or command, follow its generated output and update this README and `AGENTS.md` to match. Do not blindly overwrite a working scaffold with a generic example.

### Configure environment
Create a local `.env` from `.env.example` manually. Never commit `.env` files.

Expected configuration categories (use placeholders in `.env.example`):
- `DATABASE_URL`: Neon connection string, preferably pooled for application traffic where appropriate.
- `MODEL_PROVIDER` and provider-specific API key.
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, and installation configuration, or another least-privilege GitHub authentication method.
- Sandbox provider endpoint and credentials.
- Public app URL and server-side session/auth settings.

Do not use real secrets in docs, screenshots, tests, logs, fixtures, or issue descriptions.

### Run locally
Once the root scripts are implemented and verified:

```bash
bun install
bun run dev
bun run dev:worker
```

Run validation before opening a PR:

```bash
bun run test
bun run typecheck
bun run lint
bun run build
bun run validate
```

Only run scripts that actually exist in `package.json`. The `validate` script should run the repository's agreed quality gates and return a non-zero exit code if any gate fails.

### Mastra Studio
If Mastra Studio is configured for this repository, start it using the actual package script, for example:

```bash
bun run mastra:dev
```

Studio is a development aid, not a production orchestration service. Keep it disabled or inaccessible in production unless a deliberate, authenticated deployment design is documented.

## Product workflow
1. A user selects a repository and submits a task.
2. The control plane validates identity, repository access, policy, and budget.
3. The worker claims a durable task and starts a disposable sandbox.
4. Mastra runs the versioned SDLC workflow.
5. Tools perform explicitly authorized repository, test, scan, and integration operations.
6. The workflow records logs, artifacts, decisions, and bounded repair attempts.
7. Required approval is collected before privileged actions.
8. The system creates a pull request and reports the outcome.

## Parallel development
Use isolated Git worktrees for independent tasks. Every task needs an owner, a list of files/packages it owns, dependencies, acceptance criteria, and a Definition of Done. The integration owner resolves shared contracts and merges reviewed work. Never have two agents edit the same worktree concurrently.

Project coordination records live in `project/`:
- `TASKS.md`: task queue, ownership, dependencies, acceptance criteria, DoD.
- `STATUS.md`: current WIP, recently completed work, blockers, next tasks.
- `DECISIONS.md`: dated architectural and implementation decisions with rationale.
- `CHALLENGES.md`: mistakes, failed approaches, root cause, fix, regression test, prevention.

## Documentation
- [Agent instructions](AGENTS.md)
- [Architecture and system boundaries](ARCHITECTURE.md)
- [Skills inventory and manual-install guidance](SKILLS.md)

## Current status
This repository starts as an architectural plan. Do not claim features are implemented until the code and validation evidence exist. Keep `project/STATUS.md` current and distinguish **planned**, **in progress**, **blocked**, and **verified complete**.
