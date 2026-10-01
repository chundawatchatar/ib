import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./database.js";

export function applyMigrations(db: Database): Promise<void> {
	return migrate(db, {
		migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)),
	});
}
