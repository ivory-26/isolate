import { z } from "zod";

/**
 * Server-only configuration loading (SPEC.md §7).
 *
 * Never import this from client code: it defines every secret the app holds.
 * Bun loads `.env` automatically; this module never reads `.env*` files itself
 * and never echoes variable values in error messages.
 */

export type ModelProvider = "openrouter" | "groq";

export const MODEL_PROVIDERS: readonly ModelProvider[] = [
	"openrouter",
	"groq",
] as const;

export const DEFAULT_PROVIDER_BASE_URLS: Record<ModelProvider, string> = {
	openrouter: "https://openrouter.ai/api/v1",
	groq: "https://api.groq.com/openai/v1",
};

/** Message shown (sanitised) whenever required configuration is missing. */
export const SERVER_SETUP_HINT =
	"Setup incomplete: copy .env.example to .env, fill in DATABASE_URL, MODEL_PROVIDER, LLM_API_KEY and LLM_MODEL, then restart the server.";

export type ServerConfig = {
	/** Neon/Postgres connection string. Kept server-side and never logged. */
	databaseUrl: string;
	modelProvider: ModelProvider;
	/** Provider key, server-side only, never stored or logged. */
	llmApiKey: string;
	/** Resolved base URL (provider default unless LLM_BASE_URL overrides). */
	llmBaseUrl: string;
	/** Model id WITHOUT the provider prefix, e.g. `openai/gpt-4o-mini`. */
	llmModel: string;
	/** `${provider}/${model}` id used by the Mastra agent model object. */
	mastraModelId: `${string}/${string}`;
	/** Public base URL of the app (comes from APP_BASE_URL). */
	appBaseUrl: string;
};

export type LoadServerConfigResult =
	| { ok: true; config: ServerConfig }
	/** The message is sanitised: it names missing variables but never their values. */
	| { ok: false; message: string };

const serverEnvSchema = z.object({
	DATABASE_URL: z
		.string()
		.min(1)
		.regex(
			/^postgres(ql)?:\/\/\S+$/,
			"must start with postgres:// or postgresql://",
		),
	MODEL_PROVIDER: z.enum(["openrouter", "groq"]),
	LLM_API_KEY: z.string().min(1),
	LLM_BASE_URL: z.preprocess(
		(rawValue) =>
			typeof rawValue === "string" && rawValue.trim() === ""
				? undefined
				: rawValue,
		z
			.string()
			.min(1)
			.transform((value) => value.trim())
			.pipe(z.url("must be a valid URL"))
			.optional(),
	),
	LLM_MODEL: z.string().min(1),
	APP_BASE_URL: z.url("must be a valid URL"),
});

/** Variable names referenced so far while validating (for sanitised errors). */
function formatIssues(error: z.ZodError): string {
	const names = [
		...new Set(
			error.issues.map((issue) => String(issue.path[0] ?? "(unknown)")),
		),
	];
	return `Invalid environment variables: ${names.join(", ")}.`;
}

/** Reads the process environment: `process.env` with `Bun.env` when available. */
function readEnvRecord(): Record<string, string | undefined> {
	// `Bun` is declared by the Bun runtime, not @types/node, so access it via
	// globalThis to keep this file typecheckable during plain `tsc` runs.
	const bunEnv = (globalThis as { Bun?: { env?: unknown } }).Bun?.env;
	const bunsEnv =
		typeof bunEnv === "object" && bunEnv !== null
			? (bunEnv as Record<string, string | undefined>)
			: {};
	const processEnv = (
		typeof process !== "undefined" ? process.env : {}
	) as Record<string, string | undefined>;
	// process.env wins: under Bun both point to the same data anyway.
	return { ...bunsEnv, ...processEnv };
}

/**
 * Validates required server configuration.
 *
 * Returns `{ ok: false, message }` instead of throwing so callers can map the
 * failure to `MISSING_CONFIG` without leaking any value. The message names
 * variables only — never their contents.
 */
export function loadServerConfig(
	envRecord?: Record<string, string | undefined>,
): LoadServerConfigResult {
	const hoistedEnv = envRecord ?? readEnvRecord();
	const parsed = serverEnvSchema.safeParse(hoistedEnv);
	if (!parsed.success) {
		return {
			ok: false,
			message: `${formatIssues(parsed.error)} ${SERVER_SETUP_HINT}`,
		};
	}

	const env = parsed.data;
	const modelProvider = env.MODEL_PROVIDER as ModelProvider;
	const llmBaseUrl =
		env.LLM_BASE_URL ?? DEFAULT_PROVIDER_BASE_URLS[modelProvider];

	const config: ServerConfig = {
		databaseUrl: env.DATABASE_URL,
		modelProvider,
		llmApiKey: env.LLM_API_KEY,
		llmBaseUrl,
		llmModel: env.LLM_MODEL,
		mastraModelId: `${modelProvider}/${env.LLM_MODEL}` as `${string}/${string}`,
		appBaseUrl: env.APP_BASE_URL,
	};
	return { ok: true, config };
}
