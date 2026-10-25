# Challenges and lessons

Symptom / root cause / correction / prevention format for meaningful failures.

## 2026-10-25 — Scaffold merge wiped the first copy of the template
- Symptom: after scaffolding into `scaffold-tmp/` and copying to repo root, only hidden files (`.gitignore`, `.cta.json`, `.vscode/`) landed; `package.json`, `src/`, configs were missing.
- Root cause: a PowerShell `Copy-Item … --Exclude s*` call failed on argument position (--Exclude is not positional there); because statements after it still ran, the trailing `Remove-Item scaffold-tmp` deleted the template before the real copy happened.
- Correction: re-scaffolded and repeated the copy without the bad flag pattern, guarding each step with `-ErrorAction Stop`.
- Regression test: none (one-off shell procedure). Prevention: verify a directory exists after any conditional copy (`if (Test-Path …)`) and never run destructive cleanup calls in the same command line as fallible copies. Also committed the working scaffold state immediately so failures are detectable via git status/diff.

## 2026-10-25 — Mastra docs vs installed version drift
- Symptom: web documentation for Mastra custom OpenAI-compatible providers shows several shapes over time (gateway classes, `@ai-sdk/openai-compatible-v5` adapters, model-object with `id`, model-object with `providerId`).
- Root cause: Mastra is evolving quickly; doc pages on the "latest" docs can describe different minor lines than the package on disk.
- Correction: verified the installed package's type declarations directly (`node_modules/@mastra/core/dist/llm/model/shared.types.d.ts` → `OpenAICompatibleConfig = { id: `${string}/${string}`; url; apiKey; headers; api }`), then wrote the agent against that exact shape (`@mastra/core@1.79.0`).
- Regression test: typecheck (strict) plus an agent unit test that constructs the model config shape; provider contract locked by `.env.example` comments.
- Prevention: for fast-moving frameworks, treat installed TypeScript d.ts as the source of truth; query docs only for orientation.

## 2026-10-25 — TanStack Start server-function E2E quirks (dev vs prod IDs, CSRF, seroval)
- Symptom: driving `/_serverFn/...` from outside the browser returned 403 on the first attempt and "Invalid server function ID" for correct-looking IDs afterwards.
- Root cause (three independent checks): (a) the built-in CSRF middleware rejects requests with no same-origin `Origin` header; (b) dev-mode function IDs are base64url of an internal `{file, export}` pair managed by the Vite compiler plugin — not derivable by guessing the file path, while build-mode IDs are stable SHA256 hashes of `${filename}--${functionName}`; (c) request/response bodies use seroval serialization, not plain JSON.
- Correction: E2E (`scripts/e2e-submit.ts`) runs against the production build (`vite preview`), uses the build's own IDs extracted from `dist/server/assets/routes-*.js`, sends an `Origin` header, and encodes/decodes payloads with seroval the same way the client bundle does.
- Prevention: for E2E of TanStack server functions, prefer `bun run build && vite preview` over dev mode; re-extract function IDs after touching `src/server/functions.ts`; always send same-origin headers. Note for UI work: `.validator` rejections surface as `$TSR/Error` thrown envelopes with HTTP 200 — client code must catch them (the page's guards make this a rare path).

## 2026-10-25 — Neon cold-start dropped the first integration test connection
- Symptom: `bun test`'s real-Neon integration test failed once with a socket-level error inside postgres.js.
- Root cause: free-tier Neon compute auto-suspends; the first connection after idle can be dropped mid-handshake.
- Correction: re-running `bun test` succeeded; connection and CRUD verified repeatedly (SELECT 1, INSERT/UPDATE/SELECT, 25/25 passing).
- Prevention: README troubleshooting documents "first connection after idle may fail once — retry"; keep short pool timeouts and retry-once semantics in mind for the platform's worker design.

## 2026-10-25 — ACP/A2A fact-check for future agent interoperability
- Symptom: user asked whether to install Mastra's "ACP", A2A, or SDK packages.
- Root cause of confusion: those protocols appear in marketing/community contexts but not in the package surface or docs of the installed Mastra version.
- Correction: verified via the Mastra docs MCP — no ACP concept exists in mastra.ai docs; A2A appears only as an integration example (no dedicated package in the changelog list); `@mastra/core`'s installed docs contain zero A2A/ACP mentions. Multi-agent needs are covered natively by Agent Networks / Workflows inside `@mastra/core`.
- Prevention: gate any protocol-stack install (ACP/A2A/MCP client) behind a documented ADR per ARCHITECTURE.md §12; do not adopt interop protocols until an external consumer exists.
