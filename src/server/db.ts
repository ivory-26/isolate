import type { Sql } from "postgres";
import postgres from "postgres";
import { loadServerConfig } from "./env";

/**
 * Server-only singleton database client (postgres.js).
 *
 * Never import this from route/component files — they go through
 * `./functions.ts` so no database code can reach the browser.
 *
 * SSL: postgres.js honours `sslmode=require` `/ `sslmode=verify-full` encoded
 * in the connection string, which is how Neon URLs are formatted, so no extra
 * ssl option is needed here.
 */

/** postgres.js client type; a fresh isolated instance can be injected in tests. */
export type PgSql = Sql<Record<string, unknown>>;

let cachedSql: PgSql | null = null;

/**
 * Returns the process-wide postgres.js client, or `null` when
 * `DATABASE_URL` is missing/invalid (callers must treat that as MISSING_CONFIG;
 * nothing throws at import time and no value is ever printed).
 */
export function getDb(): PgSql | null {
	if (cachedSql) return cachedSql;
	const loaded = loadServerConfig();
	if (!loaded.ok) return null;
	cachedSql = postgres(loaded.config.databaseUrl, {
		// Neon/Supabase pooler (pgbouncer transaction mode) does not support
		// named prepared statements — postgres.js recommends prepare: false.
		prepare: false,
		// Small pool: this is a single-user smoke-test spike.
		max: 5,
		idle_timeout: 30,
		connect_timeout: 10,
		// Avoid unhandled promise rejections beyond the first connection attempt.
		onnotice: () => undefined,
	});
	return cachedSql;
}

/**
 * Creates an isolated postgres client (tests / special tooling). The caller
 * owns closing it. Exists so tests never touch the shared singleton.
 */
export function createIsolatedDb(
	databaseUrl: string,
	options?: { max?: number },
): PgSql {
	return postgres(databaseUrl, {
		prepare: false,
		max: options?.max ?? 2,
		idle_timeout: 10,
		connect_timeout: 10,
		onnotice: () => undefined,
	});
}

/**
 * Drains the singleton's connection pool at graceful-shutdown points.
 * Safe to call more than once; a closed singleton is simply rebuilt lazily.
 */
export async function closeDb(): Promise<void> {
	if (!cachedSql) return;
	const sql = cachedSql;
	cachedSql = null;
	try {
		await sql.end({ timeout: 5 });
	} catch {
		// Closing is best-effort; connection details must never surface here.
	}
}
