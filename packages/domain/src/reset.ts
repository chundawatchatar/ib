import pg from "pg";
import { requireDatabaseUrl } from "./configuration.js";
import { createDatabase } from "./database.js";
import { applyMigrations } from "./migrate.js";

// Host port published by compose.yaml.
const LOCAL_PORT = "55432";

export function assertLocalResetTarget(databaseUrl: string): URL {
	const url = new URL(requireDatabaseUrl(databaseUrl));
	if (
		!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
		url.port !== LOCAL_PORT ||
		decodeURIComponent(url.pathname.slice(1)) !== "salary_manager" ||
		decodeURIComponent(url.username) !== "salary_manager" ||
		url.search !== ""
	) {
		throw new Error(
			`db:reset only supports the local Compose database (salary_manager on port ${LOCAL_PORT})`,
		);
	}
	return url;
}

export async function resetDatabase(databaseUrl: string): Promise<void> {
	const target = assertLocalResetTarget(databaseUrl);
	const name = decodeURIComponent(target.pathname.slice(1));
	const adminUrl = new URL(target);
	adminUrl.pathname = "/postgres";
	const admin = new pg.Client({
		connectionString: adminUrl.toString(),
		connectionTimeoutMillis: 5_000,
	});
	try {
		await admin.connect();
		// name is restricted to the fixed development database above.
		await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
		await admin.query(`CREATE DATABASE "${name}"`);
	} finally {
		await admin.end();
	}
	const connection = createDatabase(databaseUrl);
	try {
		await applyMigrations(connection.db);
	} finally {
		await connection.close();
	}
}
