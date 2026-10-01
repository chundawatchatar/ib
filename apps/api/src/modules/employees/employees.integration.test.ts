import { contract } from "@salary-manager/contracts";
import {
	type DatabaseConnection,
	departments,
	employees,
	jobTitles,
} from "@salary-manager/domain";
import {
	createTestDatabase,
	generateEmployees,
	seedEmployees,
	type TestDatabase,
} from "@salary-manager/domain/testing";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startApi } from "../../start";

const id = (number: number) =>
	`00000000-0000-4000-8000-${number.toString().padStart(12, "0")}`;

describe("directory against real PostgreSQL", () => {
	let testDatabase: TestDatabase;
	let connection: DatabaseConnection;
	let runtime: Awaited<ReturnType<typeof startApi>>;
	let url: string;
	let engineeringId: string;
	let financeId: string;

	beforeEach(async () => {
		testDatabase = await createTestDatabase();
		connection = testDatabase.connection;
		const [engineering] = await connection.db
			.select()
			.from(departments)
			.where(eq(departments.name, "Engineering"));
		const [finance] = await connection.db
			.select()
			.from(departments)
			.where(eq(departments.name, "Finance"));
		const [title] = await connection.db
			.select()
			.from(jobTitles)
			.where(eq(jobTitles.name, "Engineer"));
		if (!engineering || !finance || !title)
			throw new Error("Missing migrated reference data");
		engineeringId = engineering.id;
		financeId = finance.id;
		await connection.db.insert(employees).values(
			[
				{
					id: id(1),
					code: "EMP001",
					name: "Alex Shah",
					countryCode: "US",
					currencyCode: "USD",
					departmentId: engineeringId,
					level: "L1",
					salaryMinorUnits: 10000000,
				},
				{
					id: id(2),
					code: "EMP002",
					name: "Alex Shah",
					countryCode: "US",
					currencyCode: "USD",
					departmentId: engineeringId,
					level: "L1",
					salaryMinorUnits: 15000000,
				},
				{
					id: id(3),
					code: "EMP003",
					name: "Bea Meyer",
					countryCode: "DE",
					currencyCode: "EUR",
					departmentId: financeId,
					level: "L2",
					salaryMinorUnits: 9000000,
				},
				{
					id: id(4),
					code: "EMP004",
					name: "Cara Roy",
					countryCode: "US",
					currencyCode: "USD",
					departmentId: financeId,
					level: "L2",
					salaryMinorUnits: 20000000,
					active: false,
				},
				{
					id: id(5),
					code: "EMP005",
					name: "大輔",
					countryCode: "JP",
					currencyCode: "JPY",
					departmentId: engineeringId,
					level: "L3",
					salaryMinorUnits: 9000000,
				},
				{
					id: id(6),
					code: "EMP006",
					name: "100%_\\ Match",
					countryCode: "US",
					currencyCode: "USD",
					departmentId: engineeringId,
					level: "L1",
					salaryMinorUnits: 12000000,
				},
			].map((row) => ({ ...row, jobTitleId: title.id })),
		);
		runtime = await startApi(testDatabase.databaseUrl, 0, "127.0.0.1");
		const address = runtime.server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing listener");
		url = `http://127.0.0.1:${address.port}${contract.listEmployees.path}`;
	}, 30000);
	afterEach(async () => {
		try {
			if (runtime) await runtime.close();
		} finally {
			if (testDatabase) await testDatabase.drop();
		}
	});
	async function list(query: Record<string, string> = {}) {
		const response = await fetch(`${url}?${new URLSearchParams(query)}`);
		expect(response.status).toBe(200);
		return contract.listEmployees.responses[200].parse(await response.json());
	}

	it("returns page rows with reference labels and a full-population count", async () => {
		const result = await list({ sortBy: "code", pageSize: "2" });
		expect(result).toMatchObject({ page: 1, pageSize: 2, total: 6 });
		expect(result.items.map((row) => row.id)).toEqual([id(1), id(2)]);
		expect(result.items[0]).toMatchObject({
			countryName: "United States",
			currencyMinorUnits: 2,
			departmentName: "Engineering",
			jobTitleName: "Engineer",
			version: 1,
			salaryMinorUnits: 10000000,
		});
		expect(
			(await list({ currencyCode: "JPY" })).items[0]?.currencyMinorUnits,
		).toBe(0);
	});

	it("combines every population filter and includes both salary boundaries", async () => {
		const result = await list({
			search: "aLeX",
			countryCode: "US",
			departmentId: engineeringId,
			level: "L1",
			currencyCode: "USD",
			salaryMin: "10000000",
			salaryMax: "15000000",
			status: "active",
			pageSize: "1",
		});
		expect(result.total).toBe(2);
		expect(result.items.map((row) => row.id)).toEqual([id(1)]);
	});

	it("applies individual filters and activity selection to counts and rows", async () => {
		const cases: [Record<string, string>, number[]][] = [
			[{ countryCode: "DE" }, [3]],
			[{ departmentId: financeId }, [3, 4]],
			[{ level: "L2" }, [3, 4]],
			[{ currencyCode: "JPY" }, [5]],
			[{ status: "inactive" }, [4]],
			[{ status: "active" }, [1, 2, 3, 5, 6]],
			[{ currencyCode: "USD", salaryMin: "15000000" }, [2, 4]],
			[{ currencyCode: "USD", salaryMax: "12000000" }, [1, 6]],
		];
		for (const [query, expected] of cases) {
			const result = await list({ ...query, sortBy: "code" });
			expect(result.total).toBe(expected.length);
			expect(result.items.map((row) => row.id)).toEqual(expected.map(id));
		}
	});

	it("keeps tied sorts stable across pages in either direction", async () => {
		for (const sortDirection of ["asc", "desc"]) {
			const first = await list({
				search: "Alex",
				pageSize: "1",
				sortDirection,
			});
			const second = await list({
				search: "Alex",
				pageSize: "1",
				page: "2",
				sortDirection,
			});
			expect(first.items.map((row) => row.id)).toEqual([id(1)]);
			expect(second.items.map((row) => row.id)).toEqual([id(2)]);
			expect(second.total).toBe(2);
		}
	});

	it("supports each allowlisted sort field and descending order", async () => {
		const cases: [string, number[]][] = [
			["code", [1, 2, 3, 4, 5, 6]],
			["country", [3, 5, 1, 2, 4, 6]],
			["department", [1, 2, 5, 6, 3, 4]],
			["level", [1, 2, 6, 3, 4, 5]],
			["currency", [3, 5, 1, 2, 4, 6]],
			["salary", [3, 5, 1, 6, 2, 4]],
		];
		for (const [sortBy, expected] of cases)
			expect((await list({ sortBy })).items.map((row) => row.id)).toEqual(
				expected.map(id),
			);
		expect(
			(await list({ sortBy: "salary", sortDirection: "desc" })).items.map(
				(row) => row.id,
			),
		).toEqual([4, 2, 6, 1, 3, 5].map(id));
	});

	it("searches codes, Unicode names and literal LIKE metacharacters", async () => {
		for (const [search, expected] of [
			["emp003", 3],
			["大輔", 5],
			["%_\\", 6],
			["100%", 6],
		] as const) {
			const result = await list({ search });
			expect(result.total).toBe(1);
			expect(result.items[0]?.id).toBe(id(expected));
		}
		expect((await list({ search: "' OR 1=1 --" })).total).toBe(0);
	});

	it("returns empty pages with the correct matching count", async () => {
		expect(await list({ search: "absent" })).toMatchObject({
			items: [],
			total: 0,
		});
		expect(await list({ page: "100", pageSize: "2" })).toEqual({
			items: [],
			total: 6,
			page: 100,
			pageSize: 2,
		});
		await connection.db.delete(employees);
		expect(await list()).toEqual({
			items: [],
			total: 0,
			page: 1,
			pageSize: 25,
		});
	});

	it("paginates and searches the full 10,000-employee seed", async () => {
		await connection.db.delete(employees);
		await seedEmployees(connection.db, generateEmployees());
		const result = await list({ page: "100", pageSize: "100", sortBy: "code" });
		expect(result.total).toBe(10000);
		expect(result.items).toHaveLength(100);
		const code = result.items.at(-1)?.code;
		if (!code) throw new Error("Missing last employee");
		const match = await list({ search: code });
		expect(match.total).toBe(1);
		expect(match.items[0]?.code).toBe(code);
	}, 30000);
});
