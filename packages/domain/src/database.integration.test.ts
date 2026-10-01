import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import pg from "pg";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";
import { requireDatabaseUrl } from "./configuration";
import { createDatabase, type DatabaseConnection } from "./database";
import { loadRootEnv } from "./env";
import { applyMigrations } from "./migrate";
import {
	countries,
	currencies,
	departments,
	employees,
	fxRates,
	jobTitles,
	salaryChanges,
} from "./schema/index";
import { generateEmployees, type SeedEmployee, seedEmployees } from "./seed";

loadRootEnv();

const employee: SeedEmployee = {
	id: "00000000-0000-4000-8000-000000000001",
	code: "EMP00001",
	name: "Alex Shah",
	countryCode: "US",
	currencyCode: "USD",
	department: "Engineering",
	level: "L1",
	jobTitle: "Engineer",
	salaryMinorUnits: 10000000,
	active: true,
	version: 1,
	createdAt: new Date("2026-01-01T00:00:00Z"),
	updatedAt: new Date("2026-01-01T00:00:00Z"),
};
const oneEmployee = [employee];

// The stored row, with department and job-title IDs resolved by the seed.
async function storedEmployee(connection: DatabaseConnection) {
	const row = (
		await connection.db
			.select()
			.from(employees)
			.where(eq(employees.id, employee.id))
	)[0];
	if (!row) throw new Error("Seeded employee missing");
	return row;
}

describe("real PostgreSQL", () => {
	let admin: pg.Client;
	let connection: DatabaseConnection;
	let databaseUrl: string;
	let name: string;

	beforeAll(async () => {
		if (!process.env.TEST_DATABASE_URL)
			throw new Error(
				"TEST_DATABASE_URL is required for test:db (see .env.example)",
			);
		const adminUrl = new URL(requireDatabaseUrl(process.env.TEST_DATABASE_URL));
		admin = new pg.Client({
			connectionString: adminUrl.toString(),
			connectionTimeoutMillis: 5000,
		});
		await admin.connect();
	}, 30000);

	afterAll(async () => {
		if (admin) await admin.end();
	});

	beforeEach(async () => {
		name = `salary_manager_test_${randomUUID().replaceAll("-", "")}`;
		await admin.query(`CREATE DATABASE "${name}"`);
		const url = new URL(requireDatabaseUrl(process.env.TEST_DATABASE_URL));
		url.pathname = `/${name}`;
		databaseUrl = url.toString();
		connection = createDatabase(databaseUrl);
		await applyMigrations(connection.db);
	}, 30000);

	afterEach(async () => {
		try {
			if (connection) await connection.close();
		} finally {
			if (name)
				await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
		}
	});

	it("applies migrations twice without duplicating schema or history", async () => {
		await applyMigrations(connection.db);
		const result = await connection.db.execute(
			sql`select count(*)::int as count from drizzle.__drizzle_migrations`,
		);
		expect(result.rows).toEqual([{ count: 2 }]);
	});

	it("preserves exact values across reconnects", async () => {
		await seedEmployees(connection.db, oneEmployee);
		await connection.db.insert(fxRates).values({
			sourceCurrencyCode: "EUR",
			targetCurrencyCode: "USD",
			rateDate: "2026-02-01",
			rate: "1.1234567890123456789",
		});
		await connection.close();
		connection = createDatabase(databaseUrl);
		expect(
			(await connection.db.select().from(employees))[0]?.salaryMinorUnits,
		).toBe(10000000);
		expect(
			(
				await connection.db
					.select()
					.from(fxRates)
					.where(eq(fxRates.rateDate, "2026-02-01"))
			)[0]?.rate,
		).toBe("1.1234567890123456789");
	});

	it("seeds 10,000 employees against migrated master data and rejects a repeat seed without changes", async () => {
		const seed = generateEmployees();
		expect(await seedEmployees(connection.db, seed)).toEqual({
			employees: 10000,
		});
		await expect(seedEmployees(connection.db, seed)).rejects.toThrow(
			"Employee and salary-change tables must be empty",
		);
		expect(await connection.db.$count(employees)).toBe(10000);
		expect(await connection.db.$count(salaryChanges)).toBe(0);
	}, 30000);

	it("seeds into migration-installed master data without rewriting it", async () => {
		const before = await connection.db
			.select()
			.from(countries)
			.orderBy(countries.code);
		await seedEmployees(connection.db, oneEmployee);
		expect(
			await connection.db.select().from(countries).orderBy(countries.code),
		).toEqual(before);
		expect(await connection.db.$count(currencies)).toBe(9);
		expect(await connection.db.$count(employees)).toBe(1);
	});

	it("rolls back earlier employee batches and preserves master data after a later insertion fails", async () => {
		const invalid = [
			...generateEmployees({ count: 500 }),
			{ ...employee, id: randomUUID(), code: "INVALID", salaryMinorUnits: 0 },
		];
		await expect(seedEmployees(connection.db, invalid)).rejects.toThrow();
		expect(await connection.db.$count(employees)).toBe(0);
		expect(await connection.db.$count(salaryChanges)).toBe(0);
		expect(await connection.db.$count(currencies)).toBe(9);
		expect(await connection.db.$count(countries)).toBe(10);
		expect(await connection.db.$count(departments)).toBe(5);
		expect(await connection.db.$count(jobTitles)).toBe(5);
		expect(await connection.db.$count(fxRates)).toBe(9);
	});

	it("serializes concurrent seeds so exactly one succeeds", async () => {
		const results = await Promise.allSettled([
			seedEmployees(connection.db, oneEmployee),
			seedEmployees(connection.db, oneEmployee),
		]);
		expect(
			results.filter((result) => result.status === "fulfilled"),
		).toHaveLength(1);
		expect(
			results.filter((result) => result.status === "rejected"),
		).toHaveLength(1);
		expect(await connection.db.$count(employees)).toBe(1);
	});

	it("enforces foreign keys, unique codes, positive amounts and versions", async () => {
		await seedEmployees(connection.db, oneEmployee);
		const stored = await storedEmployee(connection);
		for (const values of [
			{ ...stored, id: randomUUID() },
			{ ...stored, id: randomUUID(), code: "BAD", countryCode: "ZZ" },
			{ ...stored, id: randomUUID(), code: "BAD", currencyCode: "XXX" },
			{ ...stored, id: randomUUID(), code: "BAD", departmentId: randomUUID() },
			{ ...stored, id: randomUUID(), code: "BAD", jobTitleId: randomUUID() },
			{ ...stored, id: randomUUID(), code: "BAD", salaryMinorUnits: 0 },
			{ ...stored, id: randomUUID(), code: "BAD", salaryMinorUnits: -1 },
			{ ...stored, id: randomUUID(), code: "BAD", version: 0 },
		])
			await expect(
				connection.db.insert(employees).values(values),
			).rejects.toThrow();
		await expect(
			connection.db.execute(
				sql`update employees set salary_minor_units = 9007199254740992`,
			),
		).rejects.toThrow();
		expect(await connection.db.$count(employees)).toBe(1);
	});

	it("enforces reference and FX constraints", async () => {
		await seedEmployees(connection.db, oneEmployee);
		await expect(
			connection.db
				.insert(currencies)
				.values({ code: "XXX", name: "Invalid", minorUnits: 7 }),
		).rejects.toThrow();
		await expect(
			connection.db.insert(countries).values({ code: "xx", name: "Invalid" }),
		).rejects.toThrow();
		for (const rate of ["0", "-1", "NaN", "Infinity"]) {
			await expect(
				connection.db.update(fxRates).set({ rate }),
			).rejects.toThrow();
		}
		await expect(
			connection.db.insert(fxRates).values({
				sourceCurrencyCode: "EUR",
				targetCurrencyCode: "USD",
				rateDate: "2026-01-01",
				rate: "1.10",
			}),
		).rejects.toThrow();
	});

	it("protects audit history and rolls back a salary change when its audit insert fails", async () => {
		await seedEmployees(connection.db, oneEmployee);
		await expect(
			connection.db.transaction(async (tx) => {
				await tx
					.update(employees)
					.set({ salaryMinorUnits: 11000000, version: 2 })
					.where(eq(employees.id, employee.id));
				await tx.insert(salaryChanges).values({
					employeeId: employee.id,
					oldSalaryMinorUnits: 10000000,
					newSalaryMinorUnits: 11000000,
					oldCurrencyCode: "USD",
					newCurrencyCode: "XXX",
					employeeVersion: 2,
				});
			}),
		).rejects.toThrow();
		expect((await connection.db.select().from(employees))[0]).toMatchObject({
			salaryMinorUnits: 10000000,
			version: 1,
		});
		expect(await connection.db.$count(salaryChanges)).toBe(0);
		await connection.db.insert(salaryChanges).values({
			employeeId: employee.id,
			oldSalaryMinorUnits: 10000000,
			newSalaryMinorUnits: 11000000,
			oldCurrencyCode: "USD",
			newCurrencyCode: "USD",
			employeeVersion: 2,
		});
		await expect(connection.db.delete(employees)).rejects.toThrow();
	});
	it("installs master data during migration without employee data", async () => {
		expect(await connection.db.$count(employees)).toBe(0);
		expect(await connection.db.$count(salaryChanges)).toBe(0);
		expect(await connection.db.$count(currencies)).toBe(9);
		expect(await connection.db.$count(countries)).toBe(10);
		expect(await connection.db.$count(departments)).toBe(5);
		expect(await connection.db.$count(jobTitles)).toBe(5);
		expect(await connection.db.$count(fxRates)).toBe(9);
		expect(
			(
				await connection.db
					.select()
					.from(countries)
					.where(eq(countries.code, "IN"))
			)[0]?.defaultCurrencyCode,
		).toBe("INR");
		expect(
			(
				await connection.db
					.select()
					.from(currencies)
					.where(eq(currencies.code, "JPY"))
			)[0]?.minorUnits,
		).toBe(0);
		expect(
			(
				await connection.db
					.select()
					.from(fxRates)
					.where(eq(fxRates.sourceCurrencyCode, "EUR"))
			)[0],
		).toMatchObject({ rate: "1.10", rateDate: "2026-01-01" });
	});

	it.each([
		[{ department: "Legal" }, 'Unknown department "Legal"'],
		[{ jobTitle: "Architect" }, 'Unknown job title "Architect"'],
	])(
		"inserts nothing when a later row names missing master data",
		async (missing, message) => {
			await expect(
				seedEmployees(connection.db, [
					...generateEmployees({ count: 500 }),
					{ ...employee, id: randomUUID(), code: "INVALID", ...missing },
				]),
			).rejects.toThrow(message);
			expect(await connection.db.$count(employees)).toBe(0);
			expect(await connection.db.$count(departments)).toBe(5);
			expect(await connection.db.$count(jobTitles)).toBe(5);
		},
	);

	it("enforces country defaults and lookup uniqueness and allows titles across departments", async () => {
		await expect(
			connection.db
				.update(countries)
				.set({ defaultCurrencyCode: "XXX" })
				.where(eq(countries.code, "US")),
		).rejects.toThrow();
		for (const table of [departments, jobTitles]) {
			await expect(
				connection.db.insert(table).values({ name: "" }),
			).rejects.toThrow();
			const existing = (await connection.db.select().from(table))[0];
			if (!existing) throw new Error("Missing lookup data");
			await expect(
				connection.db.insert(table).values({ name: existing.name }),
			).rejects.toThrow();
		}
		await seedEmployees(connection.db, oneEmployee);
		const finance = (
			await connection.db
				.select()
				.from(departments)
				.where(eq(departments.name, "Finance"))
		)[0];
		if (!finance) throw new Error("Missing Finance department");
		await connection.db.insert(employees).values({
			...(await storedEmployee(connection)),
			id: randomUUID(),
			code: "EMP00002",
			departmentId: finance.id,
		});
		expect(await connection.db.$count(employees)).toBe(2);
		await connection.db
			.update(employees)
			.set({ currencyCode: "EUR" })
			.where(eq(employees.id, employee.id));
		expect(
			(
				await connection.db
					.select()
					.from(employees)
					.where(eq(employees.id, employee.id))
			)[0]?.currencyCode,
		).toBe("EUR");
	});

	it("stores optional audit reasons alongside currency changes and employee versions", async () => {
		await seedEmployees(connection.db, oneEmployee);
		await connection.db.insert(salaryChanges).values({
			employeeId: employee.id,
			oldSalaryMinorUnits: 10000000,
			newSalaryMinorUnits: 11000000,
			oldCurrencyCode: "USD",
			newCurrencyCode: "EUR",
			employeeVersion: 2,
			reason: "Country transfer",
		});
		await connection.db.insert(salaryChanges).values({
			employeeId: employee.id,
			oldSalaryMinorUnits: 11000000,
			newSalaryMinorUnits: 12000000,
			oldCurrencyCode: "EUR",
			newCurrencyCode: "EUR",
			employeeVersion: 3,
		});
		expect(
			await connection.db
				.select()
				.from(salaryChanges)
				.orderBy(salaryChanges.employeeVersion),
		).toMatchObject([
			{
				oldCurrencyCode: "USD",
				newCurrencyCode: "EUR",
				employeeVersion: 2,
				reason: "Country transfer",
			},
			{ employeeVersion: 3, reason: null },
		]);
	});
});
