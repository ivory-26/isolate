import { describe, expect, test } from "bun:test";
import {
	DEFAULT_PROVIDER_BASE_URLS,
	loadServerConfig,
	SERVER_SETUP_HINT,
} from "./env";

/**
 * Configuration validation tests. Environment values are supplied explicitly,
 * so `.env` is never read and neither tests nor output can contain real
 * secrets. Placeholder values ("supersecret") assert sanitisation.
 */

const VALID_ENV = {
	DATABASE_URL:
		"postgres://user:supersecret@example-host/dbname?sslmode=require",
	MODEL_PROVIDER: "openrouter",
	LLM_API_KEY: "sk-supersecret-key",
	LLM_MODEL: "meta-llama/llama-3.3-70b-instruct",
	APP_BASE_URL: "http://localhost:3000",
};

function baseEnv(
	overrides: Partial<Record<string, string>>,
): Record<string, string> {
	return { ...VALID_ENV, ...overrides };
}

describe("loadServerConfig", () => {
	test("accepts a fully configured environment", () => {
		const result = loadServerConfig(baseEnv({}));
		expect(result.ok).toBe(true);
		if (!result.ok) return;
		expect(result.config.modelProvider).toBe("openrouter");
		expect(result.config.mastraModelId).toBe(
			"openrouter/meta-llama/llama-3.3-70b-instruct",
		);
		expect(result.config.llmBaseUrl).toBe(
			DEFAULT_PROVIDER_BASE_URLS.openrouter,
		);
		expect(result.config.appBaseUrl).toBe("http://localhost:3000");
	});

	test("resolves the groq provider default base URL", () => {
		const result = loadConfigOrThrow(
			baseEnv({ MODEL_PROVIDER: "groq", LLM_MODEL: "llama-3.3-70b-versatile" }),
		);
		expect(result.modelProvider).toBe("groq");
		expect(result.llmBaseUrl).toBe(DEFAULT_PROVIDER_BASE_URLS.groq);
		expect(result.mastraModelId).toBe("groq/llama-3.3-70b-versatile");
	});

	test("LLM_BASE_URL overrides the provider default", () => {
		const result = loadConfigOrThrow(
			baseEnv({ LLM_BASE_URL: "https://gateway.internal/v1" }),
		);
		expect(result.llmBaseUrl).toBe("https://gateway.internal/v1");
	});

	test("empty LLM_BASE_URL (as left in .env.example) falls back to the provider default", () => {
		const result = loadConfigOrThrow(baseEnv({ LLM_BASE_URL: "" }));
		expect(result.llmBaseUrl).toBe(DEFAULT_PROVIDER_BASE_URLS.openrouter);
	});

	test("rejects an unsupported provider without echoing values", () => {
		const result = loadServerConfig(baseEnv({ MODEL_PROVIDER: "anthropic" }));
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.message).toContain("MODEL_PROVIDER");
		expect(result.message).toContain(SERVER_SETUP_HINT);
		expect(result.message).not.toContain("anthropic");
		expect(result.message).not.toContain("openrouter");
	});

	test("missing DATABASE_URL is reported by name only", () => {
		const env = baseEnv({});
		delete (env as Record<string, string | undefined>).DATABASE_URL;
		const result = loadServerConfig(env);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.message).toContain("DATABASE_URL");
		expect(result.message).toContain(SERVER_SETUP_HINT);
		expect(result.message).not.toContain("postgres://");
		expect(result.message).not.toContain("example-host");
	});

	test("missing provider configuration is reported without secret values", () => {
		const env = baseEnv({}) as Record<string, string | undefined>;
		delete env.LLM_API_KEY;
		const result = loadServerConfig(env);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.message).toContain("LLM_API_KEY");
		expect(result.message).not.toContain("sk-supersecret-key");
		expect(result.message).not.toContain("supersecret");
	});

	test("malformed DATABASE_URL is rejected without echoing the value", () => {
		const result = loadServerConfig(
			baseEnv({ DATABASE_URL: "not-a-postgres-url" }),
		);
		expect(result.ok).toBe(false);
		if (result.ok) return;
		expect(result.message).toContain("DATABASE_URL");
		expect(result.message).not.toContain("not-a-postgres-url");
	});

	test("no success path is possible when required variables are absent", () => {
		const result = loadServerConfig({});
		expect(result.ok).toBe(false);
	});
});

function loadConfigOrThrow(env: Record<string, string>) {
	const result = loadServerConfig(env);
	if (!result.ok) throw new Error("expected valid config");
	return result.config;
}
