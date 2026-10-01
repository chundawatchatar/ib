import { requireDatabaseUrl } from "./configuration";
import { createDatabase } from "./database";
import { loadRootEnv } from "./env";
import { applyMigrations } from "./migrate";
import { resetDatabase } from "./reset";
import { generateEmployees, seedEmployees } from "./seed";

async function main(): Promise<void> {
	loadRootEnv();
	const command = process.argv[2];
	const databaseUrl = requireDatabaseUrl();
	if (command === "reset") {
		await resetDatabase(databaseUrl);
		console.info(
			"Local development database recreated; schema and master data installed. No employees seeded.",
		);
		return;
	}
	if (command !== "migrate" && command !== "seed")
		throw new Error("Expected migrate, reset, or seed");
	const connection = createDatabase(databaseUrl);
	try {
		if (command === "migrate") {
			await applyMigrations(connection.db);
			console.info("Migrations applied.");
		} else {
			console.info(
				"Seeded:",
				await seedEmployees(connection.db, generateEmployees()),
			);
		}
	} finally {
		await connection.close();
	}
}

main().catch((error: unknown) => {
	// pg/Drizzle errors can include SQL values; expose only deliberate CLI errors.
	console.error(
		error instanceof Error && !error.cause
			? error.message
			: "Database operation failed. Check database connectivity and schema.",
	);
	process.exitCode = 1;
});
