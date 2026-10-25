-- Schema setup script for the isolate-mvp compatibility spike (SPEC.md §5).
--
-- Plain, idempotent SQL — there is intentionally no migration framework for
-- this spike. Run once against the Neon database, e.g.:
--   psql "$DATABASE_URL" -f db/migrations/0001_agent_smoke_test_runs.sql
-- or paste into the Neon SQL console.
--
-- `gen_random_uuid()` is built in from PostgreSQL 13+. On PostgreSQL 12 or
-- older, first run: CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agent_smoke_test_runs (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	prompt text NOT NULL CHECK (char_length(prompt) <= 2000),
	status text NOT NULL DEFAULT 'running',
	result text NULL,
	error_code text NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	finished_at timestamptz NULL,
	duration_ms integer NULL,
	CONSTRAINT agent_smoke_test_runs_status_check CHECK (status IN ('running', 'succeeded', 'failed'))
);

-- Newest-first lookup for the "recent runs" list (SPEC.md §4.8).
CREATE INDEX IF NOT EXISTS agent_smoke_test_runs_created_at_desc_idx
	ON agent_smoke_test_runs (created_at DESC);
