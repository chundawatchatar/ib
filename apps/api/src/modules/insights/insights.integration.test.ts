import { contract } from "@salary-manager/contracts";
import {
	departments,
	employees,
	fxRates,
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

describe("pay summaries against PostgreSQL", () => {
	let database: TestDatabase;
	let runtime: Awaited<ReturnType<typeof startApi>>;
	let url: string;
	let departmentId: string;
	let jobTitleId: string;
	let nextCode: number;
	beforeEach(async () => {
		database = await createTestDatabase();
		const [department] = await database.connection.db
			.select()
			.from(departments)
			.where(eq(departments.name, "Engineering"));
		const [title] = await database.connection.db
			.select()
			.from(jobTitles)
			.where(eq(jobTitles.name, "Engineer"));
		if (!department || !title) throw new Error("Missing master data");
		departmentId = department.id;
		jobTitleId = title.id;
		nextCode = 0;
		runtime = await startApi(database.databaseUrl, 0, "127.0.0.1");
		const address = runtime.server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing address");
		url = `http://127.0.0.1:${address.port}`;
	}, 30000);
	afterEach(async () => {
		try {
			if (runtime) await runtime.close();
		} finally {
			if (database) await database.drop();
		}
	});
	async function insert(
		salaryMinorUnits: number,
		currencyCode = "USD",
		extra: Partial<typeof employees.$inferInsert> = {},
	) {
		const [row] = await database.connection.db
			.insert(employees)
			.values({
				code: `EMP${nextCode++}`,
				name: "Alex",
				countryCode: "US",
				departmentId,
				jobTitleId,
				level: "L1",
				currencyCode,
				salaryMinorUnits,
				...extra,
			})
			.returning();
		if (!row) throw new Error("Missing employee");
		return row;
	}
	async function report(query: Record<string, string> = {}) {
		const response = await fetch(
			`${url}${contract.getPayInsightsSummary.path}?${new URLSearchParams(query)}`,
		);
		expect(response.status).toBe(200);
		return contract.getPayInsightsSummary.responses[200].parse(
			await response.json(),
		);
	}
	it("matches both requirements views and immediately reflects salary saves", async () => {
		await insert(10000000);
		const edited = await insert(15000000);
		await insert(9000000, "EUR");
		await insert(99999999, "USD", { active: false });
		expect(await report()).toEqual({
			view: "local",
			headcount: 3,
			rateDate: null,
			summaries: [
				{
					currencyCode: "EUR",
					currencyMinorUnits: 2,
					headcount: 1,
					total: "9000000",
					average: "9000000",
					median: "9000000",
					min: "9000000",
					max: "9000000",
					p25: "9000000",
					p75: "9000000",
				},
				{
					currencyCode: "USD",
					currencyMinorUnits: 2,
					headcount: 2,
					total: "25000000",
					average: "12500000",
					median: "12500000",
					min: "10000000",
					max: "15000000",
					p25: "11250000",
					p75: "13750000",
				},
			],
		});
		expect((await report({ view: "usd" })).summaries[0]).toMatchObject({
			headcount: 3,
			total: "34900000",
			average: "11633333",
			median: "10000000",
			min: "9900000",
			max: "15000000",
			p25: "9950000",
			p75: "12500000",
		});
		const response = await fetch(
			`${url}${contract.updateEmployeeSalary.path.replace(":id", edited.id)}`,
			{
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					version: edited.version,
					currencyCode: "USD",
					salaryMinorUnits: 16000000,
				}),
			},
		);
		expect(response.status).toBe(200);
		expect((await report()).summaries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					currencyCode: "USD",
					headcount: 2,
					total: "26000000",
					average: "13000000",
				}),
				expect.objectContaining({
					currencyCode: "EUR",
					headcount: 1,
					total: "9000000",
				}),
			]),
		);
		expect(await report({ view: "usd" })).toMatchObject({
			headcount: 3,
			rateDate: "2026-01-01",
			summaries: [
				expect.objectContaining({
					total: "35900000",
					average: "11966667",
					median: "10000000",
				}),
			],
		});
	});
	it("defines empty shapes including an empty FX table", async () => {
		expect(await report()).toEqual({
			view: "local",
			headcount: 0,
			rateDate: null,
			summaries: [],
		});
		expect((await report({ view: "usd" })).summaries).toEqual([
			{
				currencyCode: "USD",
				currencyMinorUnits: 2,
				headcount: 0,
				total: "0",
				average: null,
				median: null,
				min: null,
				max: null,
				p25: null,
				p75: null,
			},
		]);
		await database.connection.db.delete(fxRates);
		expect(await report({ view: "usd" })).toMatchObject({
			rateDate: null,
			headcount: 0,
		});
	});
	it("combines literal search and all population filters with inclusive bounds", async () => {
		await insert(100, "USD", { name: "100%_\\ Match" });
		await insert(200, "USD", { name: "100%_\\ Match" });
		await insert(150, "USD", { name: "100XX Match" });
		await insert(300, "USD", { name: "100%_\\ Match", active: false });
		const query = {
			search: "100%_\\",
			countryCode: "US",
			departmentId,
			level: "L1",
			currencyCode: "USD",
			salaryMin: "100",
			salaryMax: "200",
		};
		expect((await report(query)).summaries[0]).toMatchObject({
			headcount: 2,
			total: "300",
			average: "150",
		});
		expect((await report({ status: "inactive" })).headcount).toBe(1);
		expect((await report({ status: "all" })).headcount).toBe(4);
		expect((await report({ ...query, level: "L2" })).headcount).toBe(0);
	});
	it("interpolates large neighboring values exactly and supports unsafe aggregate totals", async () => {
		await insert(9007199254740990);
		await insert(9007199254740991);
		expect((await report()).summaries[0]).toMatchObject({
			total: "18014398509481981",
			average: "9007199254740991",
			median: "9007199254740991",
			p25: "9007199254740990",
			p75: "9007199254740991",
		});
	});
	it("rounds final statistics half up for ties and odd/even populations", async () => {
		await insert(1);
		await insert(2);
		await insert(2);
		await insert(4);
		expect((await report()).summaries[0]).toMatchObject({
			total: "9",
			average: "2",
			median: "2",
			p25: "2",
			p75: "3",
		});
		await insert(6);
		expect((await report()).summaries[0]).toMatchObject({
			median: "2",
			p25: "2",
			p75: "4",
		});
	});
	it("preserves INR and JPY fractions until final rounding", async () => {
		await insert(30, "INR");
		await insert(30, "INR");
		await insert(30, "INR");
		expect((await report({ view: "usd" })).summaries[0]).toMatchObject({
			total: "1",
			average: "0",
			median: "0",
		});
		await insert(1, "JPY");
		await insert(1, "JPY");
		await insert(1, "JPY");
		expect(
			(await report({ view: "usd", currencyCode: "JPY" })).summaries[0],
		).toMatchObject({ total: "2", average: "1", median: "1" });
		expect((await report({ currencyCode: "JPY" })).summaries[0]).toMatchObject({
			currencyMinorUnits: 0,
			total: "3",
		});
	});
	it("requires rates only for populated currencies at the latest date", async () => {
		await insert(100, "USD");
		await database.connection.db
			.delete(fxRates)
			.where(eq(fxRates.sourceCurrencyCode, "EUR"));
		expect((await report({ view: "usd" })).headcount).toBe(1);
		await insert(100, "EUR");
		const response = await fetch(
			`${url}${contract.getPayInsightsSummary.path}?view=usd`,
		);
		expect(response.status).toBe(422);
		expect(
			contract.getPayInsightsSummary.responses[422].parse(await response.json())
				.message,
		).toContain("EUR at 2026-01-01");
		expect((await report({ view: "usd", currencyCode: "USD" })).headcount).toBe(
			1,
		);
		await database.connection.db.insert(fxRates).values({
			sourceCurrencyCode: "USD",
			targetCurrencyCode: "USD",
			rateDate: "2026-02-01",
			rate: "1",
		});
		expect((await report({ view: "usd", currencyCode: "USD" })).rateDate).toBe(
			"2026-02-01",
		);
		expect(
			(await fetch(`${url}${contract.getPayInsightsSummary.path}?view=usd`))
				.status,
		).toBe(422);
	});
	it("handles an added currency without a nine-summary limit", async () => {
		// The contract remains valid when master data grows; an unused missing rate is harmless.
		const { currencies } = await import("@salary-manager/domain");
		await database.connection.db
			.insert(currencies)
			.values({ code: "CHF", name: "Swiss Franc", minorUnits: 2 });
		for (const code of [
			"USD",
			"GBP",
			"EUR",
			"INR",
			"JPY",
			"CAD",
			"AUD",
			"SGD",
			"BRL",
			"CHF",
		])
			await insert(100, code);
		expect((await report()).summaries).toHaveLength(10);
	});
	it("summarizes the complete seeded population independently of directory pages", async () => {
		await seedEmployees(database.connection.db, generateEmployees());
		const result = await report({ status: "all" });
		expect(result.headcount).toBe(10000);
		expect(result.summaries.reduce((n, row) => n + row.headcount, 0)).toBe(
			10000,
		);
		const response = await fetch(
			`${url}${contract.listEmployees.path}?pageSize=1`,
		);
		const directory = contract.listEmployees.responses[200].parse(
			await response.json(),
		);
		expect(directory.total).toBe(10000);
		expect(directory.items).toHaveLength(1);
		expect((await report({ view: "usd", status: "all" })).headcount).toBe(
			10000,
		);
	}, 30000);
});
