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
