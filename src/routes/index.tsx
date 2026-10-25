import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { getHealth, getRecentRuns, submitAgentRun } from "#/server/functions";
import {
	AGENT_RUN_PROMPT_MAX_LENGTH,
	type AgentRunRecord,
	type AgentRunResponse,
	type HealthResponse,
} from "#/server/types";

export const Route = createFileRoute("/")({ component: Home });

const PROMPT_PLACEHOLDER =
	"Explain why isolated execution is important for coding agents in two sentences.";

/** Network-level failures are shown with a fixed, safe message only. */
const GENERIC_ERROR =
	"Could not reach the server. The request failed before receiving a response.";

/** Render code as readable words, e.g. VALIDATION_FAILED -> "Validation failed". */
function prettifyCode(code: string): string {
	return code
		.toLowerCase()
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function formatTime(iso: string): string {
	const date = new Date(iso);
	// Guard against clock/parse problems rather than throwing in render.
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleString();
}

function excerpt(prompt: string, max = 96): string {
	return prompt.length > max ? `${prompt.slice(0, max)}…` : prompt;
}

const STATUS_PILL_CLASSES: Record<AgentRunRecord["status"], string> = {
	succeeded: "bg-green-100 text-green-800 border-green-200",
	failed: "bg-red-100 text-red-800 border-red-200",
	running: "bg-amber-100 text-amber-800 border-amber-200",
};

function StatusPill({ status }: { status: AgentRunRecord["status"] }) {
	return (
		<span
			className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_PILL_CLASSES[status]}`}
		>
			{status}
		</span>
	);
}

function HistoryRow({ run }: { run: AgentRunRecord }) {
	return (
		<li className="border-b border-gray-200 py-2 last:border-b-0">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<StatusPill status={run.status} />
				<span className="text-xs text-gray-500">
					{formatTime(run.createdAt) /* date only */}
				</span>
				{run.durationMs !== null && (
					<span className="text-xs text-gray-500">{run.durationMs} ms</span>
				)}
			</div>
			<div className="mt-1 text-sm text-gray-800">{excerpt(run.prompt)}</div>
		</li>
	);
}

function Home() {
	const [prompt, setPrompt] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [response, setResponse] = useState<AgentRunResponse | null>(null);
	const [requestError, setRequestError] = useState<string | null>(null);
	const [health, setHealth] = useState<HealthResponse | null>(null);
	const [runs, setRuns] = useState<AgentRunRecord[]>([]);

	const promptTrimmed = prompt.trim();
	const promptTooLong = promptTrimmed.length > AGENT_RUN_PROMPT_MAX_LENGTH;
	const canSubmit = !submitting && promptTrimmed.length > 0 && !promptTooLong;

	const fetchHealth = useCallback(async () => {
		try {
			const data = await getHealth();
			setHealth(data);
		} catch {
			// Health is a passive indicator; show nothing rather than a wrong value.
			setHealth(null);
		}
	}, []);

	const fetchHistory = useCallback(async () => {
		try {
			const data = await getRecentRuns();
			setRuns(data);
		} catch {
			// History is non-critical; leave the previous list as-is.
		}
	}, []);

	useEffect(() => {
		void fetchHealth();
		void fetchHistory();
	}, [fetchHealth, fetchHistory]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canSubmit) return;

		setSubmitting(true);
		setRequestError(null);
		setResponse(null);

		try {
			const data = await submitAgentRun({ data: { prompt: promptTrimmed } });
			setResponse(data);
			if (data.ok) {
				setPrompt("");
				void fetchHistory();
			}
		} catch {
			// Never render raw network errors or stacks.
			setRequestError(GENERIC_ERROR);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<main className="mx-auto max-w-2xl p-6">
			<header className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900">
					Isolate · Agent Smoke Test
				</h1>
				<p className="mt-1 text-sm text-gray-600">
					Submit a prompt, run one server-side agent call, and inspect the
					persisted run.
				</p>
				{health && (
					<p className="mt-2 text-sm">
						<span aria-hidden="true">🟢 </span>
						{/* Also readable by screen readers without the emoji. */}
						<span className="sr-only">Health status: </span>
						<span className={health.db ? "text-green-700" : "text-red-700"}>
							DB: {health.db ? "connected" : "unavailable"}
						</span>
					</p>
				)}
			</header>

			<section aria-labelledby="submit-heading" className="mb-8">
				<h2 id="submit-heading" className="mb-3 text-lg font-semibold">
					Run the agent
				</h2>
				<form onSubmit={handleSubmit}>
					<label
						htmlFor="prompt"
						className="mb-1 block text-sm font-medium text-gray-900"
					>
						Prompt
					</label>
					<textarea
						id="prompt"
						name="prompt"
						value={prompt}
						onChange={(event) => setPrompt(event.target.value)}
						placeholder={PROMPT_PLACEHOLDER}
						rows={3}
						maxLength={AGENT_RUN_PROMPT_MAX_LENGTH + 1}
						aria-describedby="prompt-hint"
						className="block w-full rounded-md border border-gray-300 bg-white p-2 font-sans text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
					<p id="prompt-hint" className="mt-1 text-xs text-gray-600">
						Up to {AGENT_RUN_PROMPT_MAX_LENGTH} characters.
						<span className="ml-1">
							{promptTrimmed.length}/{AGENT_RUN_PROMPT_MAX_LENGTH}
						</span>
					</p>
					<button
						type="submit"
						disabled={!canSubmit}
						aria-busy={submitting}
						className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{submitting ? "Running agent..." : "Submit"}
					</button>
				</form>

				<p className="mt-2 text-xs text-red-700">
					{promptTooLong && " Prompt exceeds the 2000-character limit."}
				</p>

				<div aria-live="polite">
					{submitting && (
						<output className="mt-4 block text-sm text-gray-700">
							Running agent...
						</output>
					)}

					{requestError && (
						<div
							className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
							role="alert"
						>
							<p className="font-medium">Request error</p>
							<p>{requestError}</p>
						</div>
					)}

					{response && !response.ok && (
						<div
							className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
							role="alert"
						>
							<p className="font-medium">{prettifyCode(response.code)}</p>
							<p>{response.message}</p>
						</div>
					)}

					{response?.ok && (
						<div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
								<span className="text-sm font-medium text-gray-900">
									Run ID: {response.run.id}
								</span>
								<StatusPill status={response.run.status} />
								<span className="text-sm text-gray-700">Saved to Postgres</span>
							</div>
							<div className="mt-3 text-sm text-gray-800">
								<p className="mb-1 font-medium">Agent result</p>
								{/* Newlines preserved; text rendered via text nodes only. */}
								<p className="whitespace-pre-wrap">{response.run.result}</p>
							</div>
						</div>
					)}
				</div>
			</section>

			<section aria-labelledby="history-heading">
				<h2 id="history-heading" className="mb-3 text-lg font-semibold">
					Recent runs
				</h2>
				{runs.length === 0 ? (
					<p className="text-sm text-gray-600">No runs yet.</p>
				) : (
					<ul>
						{runs.map((run) => (
							<HistoryRow key={run.id} run={run} />
						))}
					</ul>
				)}
			</section>
		</main>
	);
}
