/**
 * Runs `tsc --noEmit` for every workspace project, sequentially, using each
 * project's own tsconfig. Root-level; owned by the coordinator.
 */
const projects = [
	"packages/shared",
	"packages/db",
	"packages/mastra",
	"packages/workflow-schema",
	"packages/integrations",
	"apps/worker",
	"apps/web",
];

let failed = false;
for (const project of projects) {
	console.log(`typecheck: ${project}`);
	try {
		await Bun.$`bunx --bun tsc -p ${project}/tsconfig.json --noEmit`;
	} catch {
		console.error(`typecheck FAILED: ${project}`);
		failed = true;
	}
}

if (failed) process.exit(1);
console.log(`typecheck: all ${projects.length} projects passed`);
