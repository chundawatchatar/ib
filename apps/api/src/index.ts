import { startApi } from "./start.js";

async function main(): Promise<void> {
	const runtime = await startApi();
	console.info("API listening at http://localhost:3001");
	const shutdown = () => {
		runtime.close().catch(() => {
			console.error("API shutdown failed");
			process.exitCode = 1;
		});
	};
	process.once("SIGINT", shutdown);
	process.once("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : "API startup failed");
	process.exitCode = 1;
});
