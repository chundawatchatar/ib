import { describe, expect, it } from "vitest";
import { requireDatabaseUrl } from "./configuration";
import { assertLocalResetTarget } from "./reset";

describe("database configuration", () => {
	it("requires a PostgreSQL URL with a database", () => {
		for (const url of [
			"",
			"invalid",
			"https://localhost/db",
			"postgres://localhost/",
		])
			expect(() => requireDatabaseUrl(url)).toThrow();
	});
	it("accepts the local Compose target", () => {
		expect(
			assertLocalResetTarget(
				"postgresql://salary_manager:password@127.0.0.1:55432/salary_manager",
			).pathname,
		).toBe("/salary_manager");
	});
	it.each([
		"postgres://salary_manager:password@db.example.com/salary_manager",
		"postgres://salary_manager:password@localhost/postgres",
		"postgres://salary_manager:password@localhost/template1",
		"postgres://salary_manager:password@localhost/production",
		"postgres://salary_manager:password@localhost/salary_manager_dev",
		"postgres://other:password@localhost/salary_manager",
		"postgres://salary_manager:password@localhost:5432/salary_manager",
		"postgres://salary_manager:password@localhost/salary_manager",
		"postgres://salary_manager:password@localhost/salary_manager?host=remote",
		"postgres://salary_manager:password@localhost/salary_manager?options=-csearch_path%3Dpublic",
	])("rejects reset target %s", (url) => {
		expect(() => assertLocalResetTarget(url)).toThrow("local Compose database");
	});
});
