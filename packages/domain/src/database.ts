import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { requireDatabaseUrl } from "./configuration.js";
import * as schema from "./schema/index.js";

export function createDatabase(databaseUrl: string) {
	const pool = new pg.Pool({
		connectionString: requireDatabaseUrl(databaseUrl),
		connectionTimeoutMillis: 5_000,
	});
	// Idle connection failures are emitted outside request promises.
	pool.on("error", () => console.error("Database idle connection failed"));
	return {
		db: drizzle(pool, { schema }),
		checkConnection: async () => {
			await pool.query("select 1");
		},
		close: () => pool.end(),
	};
}

export type DatabaseConnection = ReturnType<typeof createDatabase>;
export type Database = DatabaseConnection["db"];
