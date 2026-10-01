import { randomUUID } from "node:crypto";
import {
	apiErrorSchema,
	type CreateEmployeeRequest,
	contract,
	type EmployeeResponse,
} from "@salary-manager/contracts";
import {
	departments,
	employees,
	jobTitles,
	salaryChanges,
} from "@salary-manager/domain";
import {
	createTestDatabase,
	type TestDatabase,
} from "@salary-manager/domain/testing";
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startApi } from "../../start";

describe("employee management against real PostgreSQL", () => {
	let testDatabase: TestDatabase;
	let runtime: Awaited<ReturnType<typeof startApi>>;
	let baseUrl: string;
	let body: CreateEmployeeRequest;
	let financeId: string;
	beforeEach(async () => {
		testDatabase = await createTestDatabase();
		const db = testDatabase.connection.db;
		const [engineering] = await db
			.select()
			.from(departments)
			.where(eq(departments.name, "Engineering"));
		const [finance] = await db
			.select()
			.from(departments)
			.where(eq(departments.name, "Finance"));
		const [title] = await db
			.select()
			.from(jobTitles)
			.where(eq(jobTitles.name, "Engineer"));
		if (!engineering || !finance || !title)
			throw new Error("Missing master data");
		financeId = finance.id;
		body = {
			code: "EMP001",
			name: "Alex Shah",
			countryCode: "US",
			currencyCode: "USD",
			departmentId: engineering.id,
			jobTitleId: title.id,
			level: "L1",
			salaryMinorUnits: 10000000,
		};
		await start();
	}, 30000);
	async function start() {
		runtime = await startApi(testDatabase.databaseUrl, 0, "127.0.0.1");
		const address = runtime.server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing listener");
		baseUrl = `http://127.0.0.1:${address.port}`;
	}
	afterEach(async () => {
		try {
			if (runtime) await runtime.close();
		} finally {
			if (testDatabase) await testDatabase.drop();
		}
	});
	function request(path: string, method: string, value?: unknown, id?: string) {
		return fetch(`${baseUrl}${id ? path.replace(":id", id) : path}`, {
			method,
			...(value === undefined
				? {}
				: {
						headers: { "content-type": "application/json" },
						body: JSON.stringify(value),
					}),
		});
	}
	async function create(value = body): Promise<EmployeeResponse> {
		const response = await request(contract.createEmployee.path, "POST", value);
		expect(response.status).toBe(201);
		return contract.createEmployee.responses[201].parse(await response.json());
	}
	async function view(id: string): Promise<EmployeeResponse> {
		const response = await request(
			contract.getEmployee.path,
			"GET",
			undefined,
			id,
		);
		expect(response.status).toBe(200);
		return contract.getEmployee.responses[200].parse(await response.json());
	}
	function profile(employee: EmployeeResponse) {
		return {
			code: employee.code,
			name: employee.name,
			countryCode: employee.countryCode,
			departmentId: employee.departmentId,
			jobTitleId: employee.jobTitleId,
			level: employee.level,
			version: employee.version,
		};
	}

	it("creates an active employee with resolved labels and persists across restart", async () => {
		const employee = await create({ ...body, name: "  Alex Shah  " });
		expect(employee).toMatchObject({
			...body,
			active: true,
			version: 1,
			countryName: "United States",
			departmentName: "Engineering",
			jobTitleName: "Engineer",
			currencyMinorUnits: 2,
		});
		expect(await view(employee.id)).toEqual(employee);
		await runtime.close();
		await start();
		expect(await view(employee.id)).toEqual(employee);
		expect(await testDatabase.connection.db.$count(employees)).toBe(1);
		expect(await testDatabase.connection.db.$count(salaryChanges)).toBe(0);
	});

	it("keeps explicit non-default currencies and exact safe-integer salaries", async () => {
		const employee = await create({
			...body,
			currencyCode: "JPY",
			salaryMinorUnits: Number.MAX_SAFE_INTEGER,
		});
		expect(employee).toMatchObject({
			countryCode: "US",
			currencyCode: "JPY",
			currencyMinorUnits: 0,
			salaryMinorUnits: Number.MAX_SAFE_INTEGER,
		});
		expect((await view(employee.id)).salaryMinorUnits).toBe(
			Number.MAX_SAFE_INTEGER,
		);
	});

	it("returns 400 field errors for unknown references and inserts nothing", async () => {
		const response = await request(contract.createEmployee.path, "POST", {
			...body,
			countryCode: "ZZ",
			currencyCode: "XXX",
			departmentId: randomUUID(),
			jobTitleId: randomUUID(),
		});
		expect(response.status).toBe(400);
		const error = apiErrorSchema.parse(await response.json());
		expect(error.issues?.map((issue) => issue.path)).toEqual([
			"countryCode",
			"departmentId",
			"jobTitleId",
			"currencyCode",
		]);
		expect(await testDatabase.connection.db.$count(employees)).toBe(0);
	});

	it("serializes duplicate-code creation so exactly one request succeeds", async () => {
		const results = await Promise.all([
			request(contract.createEmployee.path, "POST", body),
			request(contract.createEmployee.path, "POST", {
				...body,
				name: "Different name",
			}),
		]);
		expect(results.map((response) => response.status).sort()).toEqual([
			201, 409,
		]);
		const conflict = results.find((response) => response.status === 409);
		if (!conflict) throw new Error("Missing conflict");
		expect(apiErrorSchema.parse(await conflict.json()).issues?.[0]?.path).toBe(
			"code",
		);
		expect(await testDatabase.connection.db.$count(employees)).toBe(1);
	});

	it("updates profile fields, advances version and preserves compensation", async () => {
		const employee = await create();
		const response = await request(
			contract.updateEmployee.path,
			"PUT",
			{
				...profile(employee),
				name: "Alex Roy",
				code: "EMPNEW",
				countryCode: "DE",
				departmentId: financeId,
				level: "L2",
			},
			employee.id,
		);
		expect(response.status).toBe(200);
		const updated = contract.updateEmployee.responses[200].parse(
			await response.json(),
		);
		expect(updated).toMatchObject({
			name: "Alex Roy",
			code: "EMPNEW",
			countryCode: "DE",
			countryName: "Germany",
			departmentName: "Finance",
			level: "L2",
			salaryMinorUnits: employee.salaryMinorUnits,
			currencyCode: "USD",
			version: 2,
			createdAt: employee.createdAt,
		});
		expect(Date.parse(updated.updatedAt)).toBeGreaterThan(
			Date.parse(employee.updatedAt),
		);
		expect(await view(employee.id)).toEqual(updated);
		expect(await testDatabase.connection.db.$count(salaryChanges)).toBe(0);
	});

	it("rejects invalid references or compensation edits without changing the stored row", async () => {
		const employee = await create();
		for (const invalid of [
			{ countryCode: "ZZ" },
			{ departmentId: randomUUID() },
			{ jobTitleId: randomUUID() },
			{ salaryMinorUnits: 11000000 },
			{ currencyCode: "EUR" },
		]) {
			const response = await request(
				contract.updateEmployee.path,
				"PUT",
				{ ...profile(employee), ...invalid },
				employee.id,
			);
			expect(response.status).toBe(400);
			expect(await view(employee.id)).toEqual(employee);
		}
	});

	it("rolls back a duplicate-code update, including its version and timestamp", async () => {
		const first = await create();
		const second = await create({ ...body, code: "EMP002" });
		const response = await request(
			contract.updateEmployee.path,
			"PUT",
			{ ...profile(second), code: first.code, name: "Must not save" },
			second.id,
		);
		expect(response.status).toBe(409);
		expect(apiErrorSchema.parse(await response.json()).issues?.[0]?.path).toBe(
			"code",
		);
		expect(await view(second.id)).toEqual(second);
		expect(await view(first.id)).toEqual(first);
	});

	it("allows exactly one concurrent update with the same expected version", async () => {
		const employee = await create();
		const results = await Promise.all(
			["First editor", "Second editor"].map((name) =>
				request(
					contract.updateEmployee.path,
					"PUT",
					{ ...profile(employee), name },
					employee.id,
				),
			),
		);
		expect(results.map((response) => response.status).sort()).toEqual([
			200, 409,
		]);
		const success = results.find((response) => response.status === 200);
		if (!success) throw new Error("Missing success");
		const saved = contract.updateEmployee.responses[200].parse(
			await success.json(),
		);
		expect(saved.version).toBe(2);
		expect(await view(employee.id)).toEqual(saved);
	});

	it("deactivates without deleting employees or audit rows and supports current-version retries", async () => {
		const employee = await create({ ...body, salaryMinorUnits: 9000000 });
		await testDatabase.connection.db
			.update(employees)
			.set({ salaryMinorUnits: body.salaryMinorUnits, version: 2 })
			.where(eq(employees.id, employee.id));
		await testDatabase.connection.db.insert(salaryChanges).values({
			employeeId: employee.id,
			oldSalaryMinorUnits: 9000000,
			newSalaryMinorUnits: body.salaryMinorUnits,
			oldCurrencyCode: "USD",
			newCurrencyCode: "USD",
			employeeVersion: 2,
		});
		const response = await request(
			contract.deactivateEmployee.path,
			"POST",
			{ version: 2 },
			employee.id,
		);
		expect(response.status).toBe(200);
		const inactive = contract.deactivateEmployee.responses[200].parse(
			await response.json(),
		);
		expect(inactive).toMatchObject({
			active: false,
			version: 3,
			salaryMinorUnits: body.salaryMinorUnits,
		});
		const retry = await request(
			contract.deactivateEmployee.path,
			"POST",
			{ version: 3 },
			employee.id,
		);
		expect(retry.status).toBe(200);
		expect(
			contract.deactivateEmployee.responses[200].parse(await retry.json()),
		).toEqual(inactive);
		const stale = await request(
			contract.deactivateEmployee.path,
			"POST",
			{ version: 2 },
			employee.id,
		);
		expect(stale.status).toBe(409);
		expect(await view(employee.id)).toEqual(inactive);
		expect(await testDatabase.connection.db.$count(employees)).toBe(1);
		expect(await testDatabase.connection.db.$count(salaryChanges)).toBe(1);
		const directory = await request(
			`${contract.listEmployees.path}?status=active`,
			"GET",
		);
		expect(
			contract.listEmployees.responses[200].parse(await directory.json()).total,
		).toBe(0);
	});

	it("protects profile edits racing with deactivation", async () => {
		const employee = await create();
		const results = await Promise.all([
			request(
				contract.updateEmployee.path,
				"PUT",
				{ ...profile(employee), name: "New name" },
				employee.id,
			),
			request(
				contract.deactivateEmployee.path,
				"POST",
				{ version: 1 },
				employee.id,
			),
		]);
		expect(results.map((response) => response.status).sort()).toEqual([
			200, 409,
		]);
		expect((await view(employee.id)).version).toBe(2);
	});

	it("returns declared 404 responses for absent employees", async () => {
		const missing = randomUUID();
		for (const [path, method, value] of [
			[contract.getEmployee.path, "GET", undefined],
			[
				contract.updateEmployee.path,
				"PUT",
				{ ...profile(await create()), version: 1 },
			],
			[contract.deactivateEmployee.path, "POST", { version: 1 }],
		] as const) {
			const response = await request(path, method, value, missing);
			expect(response.status).toBe(404);
			expect(apiErrorSchema.parse(await response.json())).toEqual({
				message: "Employee not found",
			});
		}
	});
	it("saves exact compensation and audit history atomically and survives restart", async () => {
		const employee = await create({ ...body, salaryMinorUnits: 15000000 });
		const response = await request(
			contract.updateEmployeeSalary.path,
			"PUT",
			{
				version: 1,
				currencyCode: "USD",
				salaryMinorUnits: 16000000,
				reason: "  Annual review  ",
			},
			employee.id,
		);
		expect(response.status).toBe(200);
		const saved = contract.updateEmployeeSalary.responses[200].parse(
			await response.json(),
		);
		expect(saved).toMatchObject({
			...employee,
			salaryMinorUnits: 16000000,
			version: 2,
			updatedAt: expect.any(String),
		});
		expect(Date.parse(saved.updatedAt)).toBeGreaterThan(
			Date.parse(employee.updatedAt),
		);
		const [audit] = await testDatabase.connection.db
			.select()
			.from(salaryChanges);
		expect(audit).toMatchObject({
			employeeId: employee.id,
			oldSalaryMinorUnits: 15000000,
			newSalaryMinorUnits: 16000000,
			oldCurrencyCode: "USD",
			newCurrencyCode: "USD",
			employeeVersion: 2,
			reason: "Annual review",
			changedAt: new Date(saved.updatedAt),
		});
		await runtime.close();
		await start();
		expect(await view(employee.id)).toEqual(saved);
		const currencyChange = await request(
			contract.updateEmployeeSalary.path,
			"PUT",
			{
				version: 2,
				currencyCode: "JPY",
				salaryMinorUnits: Number.MAX_SAFE_INTEGER,
			},
			employee.id,
		);
		expect(currencyChange.status).toBe(200);
		expect(
			contract.updateEmployeeSalary.responses[200].parse(
				await currencyChange.json(),
			),
		).toMatchObject({
			countryCode: "US",
			currencyCode: "JPY",
			currencyMinorUnits: 0,
			salaryMinorUnits: Number.MAX_SAFE_INTEGER,
			version: 3,
		});
		const audits = await testDatabase.connection.db
			.select()
			.from(salaryChanges);
		expect(audits).toHaveLength(2);
		expect(audits.find((row) => row.employeeVersion === 3)).toMatchObject({
			oldCurrencyCode: "USD",
			newCurrencyCode: "JPY",
			oldSalaryMinorUnits: 16000000,
			newSalaryMinorUnits: Number.MAX_SAFE_INTEGER,
			reason: null,
		});
	});

	it("rejects missing, invalid and stale salary edits without changing data or history", async () => {
		const employee = await create();
		for (const [patch, status] of [
			[{ currencyCode: "XXX" }, 400],
			[{ salaryMinorUnits: 0 }, 400],
			[{ version: 2 }, 409],
		] as const) {
			const response = await request(
				contract.updateEmployeeSalary.path,
				"PUT",
				{
					version: 1,
					currencyCode: "USD",
					salaryMinorUnits: 16000000,
					...patch,
				},
				employee.id,
			);
			expect(response.status).toBe(status);
			const error = apiErrorSchema.parse(await response.json());
			if ("currencyCode" in patch)
				expect(error.issues?.[0]?.path).toBe("currencyCode");
			expect(await view(employee.id)).toEqual(employee);
			expect(await testDatabase.connection.db.$count(salaryChanges)).toBe(0);
		}
		const missing = await request(
			contract.updateEmployeeSalary.path,
			"PUT",
			{
				version: 1,
				currencyCode: "USD",
				salaryMinorUnits: 16000000,
			},
			randomUUID(),
		);
		expect(missing.status).toBe(404);
	});

	it("allows only one concurrent salary edit with the same expected version and one audit row", async () => {
		const employee = await create();
		const responses = await Promise.all(
			[16000000, 17000000].map((salaryMinorUnits) =>
				request(
					contract.updateEmployeeSalary.path,
					"PUT",
					{ version: 1, currencyCode: "USD", salaryMinorUnits },
					employee.id,
				),
			),
		);
		expect(responses.map((response) => response.status).sort()).toEqual([
			200, 409,
		]);
		const success = responses.find((response) => response.status === 200);
		if (!success) throw new Error("Missing success");
		const saved = contract.updateEmployeeSalary.responses[200].parse(
			await success.json(),
		);
		expect(await view(employee.id)).toEqual(saved);
		const audits = await testDatabase.connection.db
			.select()
			.from(salaryChanges);
		expect(audits).toHaveLength(1);
		expect(audits[0]).toMatchObject({
			employeeVersion: 2,
			newSalaryMinorUnits: saved.salaryMinorUnits,
		});
	});

	it("shares the version lock with profile edits and deactivation", async () => {
		for (const other of ["profile", "deactivate"] as const) {
			const employee = await create({ ...body, code: other });
			const responses = await Promise.all([
				request(
					contract.updateEmployeeSalary.path,
					"PUT",
					{ version: 1, currencyCode: "USD", salaryMinorUnits: 16000000 },
					employee.id,
				),
				other === "profile"
					? request(
							contract.updateEmployee.path,
							"PUT",
							{ ...profile(employee), name: "New name" },
							employee.id,
						)
					: request(
							contract.deactivateEmployee.path,
							"POST",
							{ version: 1 },
							employee.id,
						),
			]);
			expect(responses.map((response) => response.status).sort()).toEqual([
				200, 409,
			]);
			expect((await view(employee.id)).version).toBe(2);
			expect(
				await testDatabase.connection.db.$count(
					salaryChanges,
					eq(salaryChanges.employeeId, employee.id),
				),
			).toBe(responses[0]?.status === 200 ? 1 : 0);
		}
	});

	it("rolls back salary, currency, version and timestamp when the audit insert fails", async () => {
		const employee = await create();
		// A real database constraint failure after the employee update proves rollback.
		await testDatabase.connection.db.execute(
			sql`alter table salary_changes add constraint reject_test_audit check (reason is distinct from 'reject audit')`,
		);
		const response = await request(
			contract.updateEmployeeSalary.path,
			"PUT",
			{
				version: 1,
				currencyCode: "EUR",
				salaryMinorUnits: 9000000,
				reason: "reject audit",
			},
			employee.id,
		);
		expect(response.status).toBe(500);
		expect(apiErrorSchema.parse(await response.json()).message).toBe(
			"Internal server error",
		);
		expect(await view(employee.id)).toEqual(employee);
		expect(await testDatabase.connection.db.$count(salaryChanges)).toBe(0);
	});

	it("audits current-version saves even when compensation is unchanged or the employee is inactive", async () => {
		const employee = await create();
		await request(
			contract.deactivateEmployee.path,
			"POST",
			{ version: 1 },
			employee.id,
		);
		const response = await request(
			contract.updateEmployeeSalary.path,
			"PUT",
			{
				version: 2,
				currencyCode: employee.currencyCode,
				salaryMinorUnits: employee.salaryMinorUnits,
			},
			employee.id,
		);
		expect(response.status).toBe(200);
		expect(
			contract.updateEmployeeSalary.responses[200].parse(await response.json()),
		).toMatchObject({ active: false, version: 3 });
		expect(await testDatabase.connection.db.$count(salaryChanges)).toBe(1);
	});
});
