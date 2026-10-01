import { randomUUID } from "node:crypto";
import pg from "pg";
import { requireDatabaseUrl } from "./configuration.js";
import { createDatabase, type DatabaseConnection } from "./database.js";
import { loadRootEnv } from "./env.js";
import { applyMigrations } from "./migrate.js";

// Test-only helpers for integration tests in other workspace projects.
// Import from "@salary-manager/domain/testing"; never from application code.
export { applyMigrations } from "./migrate.js";
export {
	generateEmployees,
	type SeedEmployee,
	seedEmployees,
} from "./seed.js";

export type TestDatabase = {
	connection: DatabaseConnection;
	databaseUrl: string;
	/** Closes the connection and drops the database. */
	drop: () => Promise<void>;
};

/**
 * Creates a uniquely named, fully migrated database through TEST_DATABASE_URL
 * (an admin connection with CREATEDB). Reference data is installed; employees
 * are empty. Always call `drop()` in teardown.
 */
export async function createTestDatabase(): Promise<TestDatabase> {
	loadRootEnv();
	if (!process.env.TEST_DATABASE_URL)
		throw new Error("TEST_DATABASE_URL is required for test:db");
	const adminUrl = requireDatabaseUrl(process.env.TEST_DATABASE_URL);
	const name = `salary_manager_test_${randomUUID().replaceAll("-", "")}`;
	await withAdmin(adminUrl, (admin) =>
		admin.query(`CREATE DATABASE "${name}"`),
	);
	const url = new URL(adminUrl);
	url.pathname = `/${name}`;
	const databaseUrl = url.toString();
	const connection = createDatabase(databaseUrl);
	try {
		await applyMigrations(connection.db);
	} catch (error) {
		await connection.close();
		await withAdmin(adminUrl, (admin) =>
			admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`),
		);
		throw error;
	}
	return {
		connection,
		databaseUrl,
		drop: async () => {
			try {
				await connection.close();
			} finally {
				await withAdmin(adminUrl, (admin) =>
					admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`),
				);
			}
		},
	};
}

async function withAdmin<T>(
	adminUrl: string,
	run: (admin: pg.Client) => Promise<T>,
): Promise<T> {
	const admin = new pg.Client({
		connectionString: adminUrl,
		connectionTimeoutMillis: 5_000,
	});
	await admin.connect();
	try {
		return await run(admin);
	} finally {
		await admin.end();
	}
}
