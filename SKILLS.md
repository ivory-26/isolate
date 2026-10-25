# Skills Inventory and Manual Installation Plan

This file lists the reusable agent skills that would support development and operation of this project. It is an inventory, not a claim that these skills are installed. Install skills manually from trusted sources, review their contents before enabling them, and pin versions or commits where possible.

## Skill installation policy
- Install only skills needed by an active task; do not load every skill into every agent context.
- Prefer official vendor documentation, reviewed internal skills, and pinned repository commits.
- Read each skill's instructions and scripts before use. Treat skill files and linked resources as untrusted code/content.
- Never allow a skill to bypass application authorization, sandbox isolation, secret-handling rules, or human approval.
- Skills provide guidance and procedures; enforce permissions in typed tools and trusted application code.
- Record installed skills, version/source, owner, intended agent, and review status in `project/SKILL-REGISTRY.md` when the registry is created.

## Essential project skills

| Skill | Used by | Purpose / acceptance criteria |
|---|---|---|
| TypeScript engineering | All developers | Strict types, narrow interfaces, safe error handling, no `any` without a documented reason. |
| Bun workspace and package management | Integrator | Reproducible installs, workspace scripts, lockfile discipline, compatible tooling. |
| TanStack Start / Router | Web agents | File-based routes, loaders, server functions/handlers, server/client boundaries, correct navigation. |
| TanStack Query | Web agents | Query keys, caching, invalidation, mutations, loading/error states, no secret-bearing client cache. |
| React UI and accessibility | Web/UI agents | Reusable components, keyboard navigation, accessible forms, responsive layouts. |
| React Flow workflow editor | Workflow UI agents | Typed nodes/edges, custom node editors, validation feedback, graph serialization, accessible controls. |
| Zod schema design | All agents | Runtime validation at API, model, tool, workflow, and integration boundaries. |
| Mastra agents and tools | Agent-runtime agents | Agent configuration, typed tools, provider integration, tool-call validation, bounded execution. |
| Mastra workflows | Orchestration agents | Deterministic steps, branching, retries, suspension/resumption, workflow testing and persistence. |
| Mastra storage and observability | Runtime/integration agents | Verify supported storage adapter, traces, run metadata, failure recovery, safe logging. |
| LLM provider abstraction | Model agents | Provider-neutral interfaces, capabilities, structured outputs, tool calling, fallback policy, budgets. |
| MCP client integration | Integration agents | Server allowlists, schema validation, tool discovery, transport lifecycle, untrusted tool output. |
| GitHub App and API integration | Git agents | Least-privilege installations, repository permissions, branches, commits, checks, pull requests, webhooks. |
| Git worktrees and branch isolation | Sandbox agents | Safe worktree lifecycle, unique branch naming, cleanup, no concurrent writes to one checkout. |
| Cloud sandbox / VM lifecycle | Sandbox agents | Provisioning, timeouts, resource limits, scoped credentials, network controls, cleanup. |
| Neon PostgreSQL | Data agents | Connection configuration, pooling constraints, migrations, transactions, tenant isolation, backups. |
| Database schema and migrations | Data/integration agents | Safe migration design, forward/backward compatibility, migration ownership and test fixtures. |
| Durable queues and idempotency | Worker agents | Atomic claims, retry/backoff, deduplication, leases, dead-letter states, cancellation. |
| Authentication and authorization | Security/backend agents | Session handling, tenant boundaries, RBAC, server-side checks, secure defaults. |
| DevSecOps threat modeling | Security agent | Threat models, trust boundaries, attack surfaces, mitigations and abuse cases. |
| Secure secret management | Security/integration agents | Secret redaction, scoped tokens, rotation, short-lived credentials, no secret exposure to models. |
| Prompt-injection defense | Agent/security agents | Treat repo/issue/MCP content as untrusted, tool allowlists, policy enforcement outside the model. |
| Testing strategy | All developers | Unit, integration, contract, end-to-end, failure-injection, and tenant-isolation tests. |
| Test-driven bug fixing | All developers | Reproduce first, add regression test, fix root cause, rerun targeted and full checks. |
| CI/CD and repository automation | Integrator | CI quality gates, deterministic scripts, protected branches, artifacts and failure reporting. |
| Structured logging and tracing | Worker/runtime agents | Correlation IDs, redaction, event schemas, duration/error metadata, trace-to-run linkage. |
| Technical documentation | All developers | Keep README, architecture, API contracts, runbooks, decisions and task state current. |
| Git worktree swarm coordination | Coordinator/integration agents | Task ownership, file boundaries, dependencies, isolated worktrees, conflict resolution, reviewed integration. |

## Recommended role-specific skill bundles

### 1. Coordinator / technical lead
Install:
- Task decomposition and dependency mapping
- Multi-agent coordination with Git worktrees
- Architecture decision records (ADRs)
- Code review and integration management
- Definition of Done and release readiness

Responsibilities:
- Maintain `project/TASKS.md` and `project/STATUS.md`.
- Define interfaces and ownership before parallel work starts.
- Assign independent tasks and identify shared-file conflicts.
- Keep one integration owner responsible for the integrated branch.
- Reject vague tasks without acceptance criteria or validation steps.

### 2. TanStack frontend agent
Install:
- TanStack Start and Router
- TanStack Query
- React, TypeScript and accessibility
- Tailwind CSS / shadcn/ui
- React Flow custom nodes and graph editing
- Frontend testing (Vitest and browser E2E tooling selected by the project)

Deliver:
- Routes and UI only within assigned packages.
- Typed API client contracts and loading/error/empty states.
- No database, model-provider, sandbox, or secret imports in browser code.

### 3. Mastra runtime agent
Install:
- Mastra agents, tools and workflows
- Model provider abstraction
- Workflow persistence and recovery
- Tool schemas and validation
- LLM evaluation and tracing
- Human-in-the-loop patterns

Deliver:
- Tested workflow definitions with bounded retries.
- No direct host shell execution.
- All side-effecting tools call trusted policy checks and write audit events.

### 4. Sandbox and Git agent
Install:
- Cloud sandbox SDK for the selected provider
- Git CLI and worktree lifecycle
- Process execution and timeout management
- Secure credential brokering
- Network-egress and resource-limit controls
- Cleanup and failure recovery

Deliver:
- Per-task isolation and reproducible cleanup.
- No untrusted commands on the web or worker host.
- Tests for timeout, cancellation, provisioning failure, and leaked resources.

### 5. Data and worker agent
Install:
- Neon PostgreSQL and selected database client/ORM
- SQL migrations and transaction design
- Durable job queue, idempotency and retry patterns
- Multi-tenant data isolation
- Integration and concurrency testing

Deliver:
- Explicit task/run state transitions.
- Atomic job claiming and duplicate protection.
- Schema/migration changes with compatibility notes and tests.

### 6. Integrations and MCP agent
Install:
- GitHub App / GitHub API
- MCP TypeScript SDK
- OAuth or installation-token lifecycle
- API contract testing
- Rate limits, retries, webhook verification
- Secret redaction and audit logging

Deliver:
- Each connector has typed input/output schemas, permission scopes, tests, error mapping and documentation.
- Unknown MCP servers and tools are denied by default.

### 7. Security reviewer
Install:
- Threat modeling (STRIDE or equivalent)
- OWASP web/API security
- LLM application security and prompt injection
- Dependency and source scanning
- Authorization/tenant-isolation testing
- Secrets detection and secure logging

Deliver:
- Findings classified by severity with evidence and remediation.
- No approval based only on the coding agent's self-assessment.
- High-risk actions remain blocked until policy and approval requirements are satisfied.

### 8. QA / validation agent
Install:
- Test planning and coverage analysis
- Vitest or selected unit test framework
- API and integration testing
- Playwright or selected E2E framework
- Failure injection and recovery testing
- Regression-test design

Deliver:
- Reproducible commands and recorded outcomes.
- Tests for normal, error, timeout, retry, cancellation, and permission-denied paths.
- No “pass” claim without actual execution evidence.

### 9. Documentation and release agent
Install:
- Technical writing
- Architecture diagram maintenance
- ADR maintenance
- Release checklist and changelog
- Runbook and incident documentation

Deliver:
- Documentation matches the current implementation.
- Architecture changes update `ARCHITECTURE.md` in the same PR.
- Task status distinguishes planned, in progress, blocked, and verified complete.

## Later / optional skills
Install these only when the corresponding feature is scheduled:
- Retrieval-augmented generation (RAG) and embedding evaluation
- Vector search and hybrid retrieval
- OpenTelemetry and advanced observability
- Kubernetes and VM fleet management
- Multi-agent delegation and task negotiation
- Browser automation for external admin consoles
- Release deployment, rollback, and incident response
- Cost attribution, quotas, and model routing optimization
- Enterprise SSO, SCIM, and advanced RBAC
- Plugin/skill marketplace review and signing
- Policy-as-code and compliance evidence generation

## Skill review checklist
Before enabling a skill, verify:
- [ ] Source is trusted and version/commit is pinned.
- [ ] Instructions do not request secret disclosure or policy bypass.
- [ ] Scripts and network calls are understood and necessary.
- [ ] Tools and filesystem scope are limited to the agent's task.
- [ ] The skill has an owner, purpose, and review date.
- [ ] Any claimed behavior is tested against the current repository.
- [ ] It does not duplicate another skill with conflicting instructions.
