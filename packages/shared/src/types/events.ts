import { z } from "zod";

/**
 * Append-only event vocabulary for run timelines and audit trails.
 * Every agent turn, tool call, workflow step, and approval action emits exactly
 * one of these; `data` payload shapes are declared per type by consumers.
 */
export const RUN_EVENT_TYPES = [
	"task.enqueued",
	"task.claimed",
	"task.state_changed",
	"agent.turn_started",
	"agent.turn_finished",
	"tool.invoked",
	"tool.denied_by_policy",
	"workflow.step_started",
	"workflow.step_finished",
	"workflow.step_failed",
	"validation.started",
	"validation.finished",
	"repair.started",
	"repair.finished",
	"approval.requested",
	"approval.decided",
	"pr.created",
	"worker.lease_renewed",
	"worker.job_failed",
	"worker.job_dead_lettered",
] as const;

export type RunEventType = (typeof RUN_EVENT_TYPES)[number];

export const runEventTypeSchema = z.enum(RUN_EVENT_TYPES);

/** Actor kinds for attribution; never store raw credentials here. */
export const EVENT_ACTORS = [
	"user",
	"agent",
	"worker",
	"system",
	"policy",
] as const;
export type EventActor = (typeof EVENT_ACTORS)[number];

/**
 * A persisted event row. `data` is a JSON object whose shape depends on
 * `type`; consumers validate with schemas before trusting it.
 */
export type RunEvent<TData = unknown> = {
	id: string;
	taskId: string;
	workflowRunId: string | null;
	type: RunEventType;
	actor: EventActor;
	data: TData;
	occurredAt: string;
};

export const runEventEnvelopeSchema = z.object({
	taskId: z.string().min(1),
	workflowRunId: z.string().nullable(),
	type: runEventTypeSchema,
	actor: z.enum(EVENT_ACTORS),
	data: z.record(z.string(), z.unknown()).default({}),
});
