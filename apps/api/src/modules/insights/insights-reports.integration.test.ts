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

describe("grouped pay and histogram reports against PostgreSQL", () => {
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

	async function groups(query: Record<string, string> = {}) {
		const response = await fetch(
			`${url}${contract.getPayInsightsGroups.path}?${new URLSearchParams({ groupBy: "level", ...query })}`,
		);
		expect(response.status).toBe(200);
		return contract.getPayInsightsGroups.responses[200].parse(
			await response.json(),
		);
	}
	async function histogram(query: Record<string, string> = {}) {
		const response = await fetch(
			`${url}${contract.getPayInsightsHistogram.path}?${new URLSearchParams(query)}`,
		);
		expect(response.status).toBe(200);
		return contract.getPayInsightsHistogram.responses[200].parse(
			await response.json(),
		);
	}
	it("groups the requirements fixture by all dimensions with separate local currencies", async () => {
		await insert(10000000);
		await insert(15000000);
		await insert(9000000, "EUR");
		await insert(99999999, "USD", { active: false });
		for (const groupBy of ["country", "department", "level", "jobTitle"]) {
			const local = await groups({ groupBy });
			expect(local.headcount).toBe(3);
			expect(local.groups).toHaveLength(1);
			expect(local.groups[0]).toMatchObject({
				key: {
					country: "US",
					department: departmentId,
					level: "L1",
					jobTitle: jobTitleId,
				}[groupBy],
				headcount: 3,
				summaries: [
					{
						currencyCode: "EUR",
						headcount: 1,
						total: "9000000",
						average: "9000000",
						median: "9000000",
					},
					{
						currencyCode: "USD",
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
			for (const group of local.groups)
				expect(group.summaries.reduce((n, s) => n + s.headcount, 0)).toBe(
					group.headcount,
				);
			const usd = await groups({ groupBy, view: "usd" });
			expect(usd.groups[0]).toMatchObject({
				headcount: 3,
				summaries: [
					{
						currencyCode: "USD",
						headcount: 3,
						total: "34900000",
						average: "11633333",
						median: "10000000",
						min: "9900000",
						max: "15000000",
						p25: "9950000",
						p75: "12500000",
					},
				],
			});
		}
	});
	it("uses master labels, combines shared job titles, and sorts levels naturally", async () => {
		const [finance] = await database.connection.db
			.select()
			.from(departments)
			.where(eq(departments.name, "Finance"));
		if (!finance) throw new Error("Missing Finance");
		await insert(100, "USD", { level: "L10" });
		await insert(200, "USD", { level: "L2", departmentId: finance.id });
		await insert(300, "USD", { level: "L1", countryCode: "IN" });
		expect((await groups()).groups.map((g) => g.label)).toEqual([
			"L1",
			"L2",
			"L10",
		]);
		expect(
			(await groups({ groupBy: "department" })).groups.map((g) => g.label),
		).toEqual(["Engineering", "Finance"]);
		expect(
			(await groups({ groupBy: "country" })).groups.map((g) => g.label),
		).toEqual(["India", "United States"]);
		const titles = await groups({ groupBy: "jobTitle" });
		expect(titles.groups).toHaveLength(1);
		expect(titles.groups[0]).toMatchObject({
			key: jobTitleId,
			label: "Engineer",
			headcount: 3,
			summaries: [{ total: "600" }],
		});
	});
	it("combines literal search and all filters across groups and histograms", async () => {
		await insert(100, "USD", { name: "Alex%_", level: "L2" });
		await insert(200, "USD", { name: "Alex%_", level: "L2" });
		await insert(300, "USD", { name: "Alex%_", level: "L2" });
		await insert(150, "USD", { name: "Alex%_", level: "L2", active: false });
		await insert(150, "USD", { name: "Alexzz", level: "L2" });
		await insert(150, "EUR", { name: "Alex%_", level: "L2" });
		const query = {
			search: "%_",
			countryCode: "US",
			departmentId,
			level: "L2",
			currencyCode: "USD",
			salaryMin: "100",
			salaryMax: "200",
		};
		expect((await groups(query)).headcount).toBe(2);
		expect((await histogram(query)).headcount).toBe(2);
		expect((await groups({ ...query, status: "all" })).headcount).toBe(3);
		expect((await histogram({ ...query, status: "inactive" })).headcount).toBe(
			1,
		);
	});
	it("defines empty and constant populations, including an empty FX table", async () => {
		await database.connection.db.delete(fxRates);
		for (const view of ["local", "usd"]) {
			expect(await groups({ view })).toEqual({
				view,
				rateDate: null,
				headcount: 0,
				groupBy: "level",
				groups: [],
			});
			expect(await histogram({ view })).toEqual({
				view,
				rateDate: null,
				headcount: 0,
				distributions:
					view === "local"
						? []
						: [
								{
									currencyCode: "USD",
									currencyMinorUnits: 2,
									headcount: 0,
									buckets: [],
								},
							],
			});
		}
		await insert(123);
		expect((await histogram()).distributions[0]?.buckets).toEqual([
			{
				lowerBound: "123",
				upperBound: "123",
				upperInclusive: true,
				headcount: 1,
			},
		]);
		await insert(123);
		expect(
			(await histogram({ view: "usd" })).distributions[0]?.buckets,
		).toEqual([
			{
				lowerBound: "123",
				upperBound: "123",
				upperInclusive: true,
				headcount: 2,
			},
		]);
	});
	it("uses round bands, assigns internal edges upward, and includes the maximum", async () => {
		for (const amount of [1000000, 1000001, 2000000, 2999999, 11000000])
			await insert(amount);
		const report = await histogram();
		expect(report.headcount).toBe(5);
		const distribution = report.distributions[0];
		expect(distribution?.buckets).toHaveLength(10);
		expect(distribution?.buckets.map((b) => b.headcount)).toEqual([
			2, 2, 0, 0, 0, 0, 0, 0, 0, 1,
		]);
		expect(distribution?.buckets[0]).toEqual({
			lowerBound: "1000000",
			upperBound: "2000000",
			upperInclusive: false,
			headcount: 2,
		});
		expect(distribution?.buckets[9]).toEqual({
			lowerBound: "10000000",
			upperBound: "11000000",
			upperInclusive: true,
			headcount: 1,
		});
	});
	it.each([
		[101, 112, "100", "102", 6],
		[101, 132, "100", "105", 7],
		[101, 182, "100", "110", 9],
		[101, 201, "100", "110", 11],
	] as const)(
		"selects nice widths for %i–%i",
		async (minimum, maximum, lower, upper, count) => {
			await insert(minimum);
			await insert(maximum);
			const buckets = (await histogram()).distributions[0]?.buckets;
			expect(buckets).toHaveLength(count);
			expect(buckets?.[0]).toMatchObject({
				lowerBound: lower,
				upperBound: upper,
				headcount: 1,
			});
			expect(buckets?.reduce((n, b) => n + b.headcount, 0)).toBe(2);
		},
	);
	it("keeps exact FX fractions at bucket boundaries and separates local currencies", async () => {
		await database.connection.db
			.update(fxRates)
			.set({ rate: "0.0101" })
			.where(eq(fxRates.sourceCurrencyCode, "INR"));
		await insert(1, "INR");
		await insert(2, "INR");
		await insert(100, "JPY");
		const local = await histogram();
		expect(
			local.distributions.map((d) => [
				d.currencyCode,
				d.currencyMinorUnits,
				d.headcount,
			]),
		).toEqual([
			["INR", 2, 2],
			["JPY", 0, 1],
		]);
		const usd = await histogram({ view: "usd", currencyCode: "INR" });
		expect(usd.distributions[0]?.buckets).toHaveLength(6);
		expect(usd.distributions[0]?.buckets[0]).toEqual({
			lowerBound: "0.01",
			upperBound: "0.012",
			upperInclusive: false,
			headcount: 1,
		});
		expect(usd.distributions[0]?.buckets[5]).toEqual({
			lowerBound: "0.02",
			upperBound: "0.022",
			upperInclusive: true,
			headcount: 1,
		});
		expect(
			(await groups({ view: "usd", currencyCode: "INR" })).groups[0]
				?.summaries[0],
		).toMatchObject({ headcount: 2, total: "0", median: "0" });
	});
	it("supports very small FX fractions without float logarithms or division rounding", async () => {
		await database.connection.db
			.update(fxRates)
			.set({ rate: "0.000000000000000000000000000001" })
			.where(eq(fxRates.sourceCurrencyCode, "EUR"));
		await insert(1, "EUR");
		await insert(2, "EUR");
		const distribution = (await histogram({ view: "usd" })).distributions[0];
		expect(distribution?.buckets).toHaveLength(10);
		expect(distribution?.buckets[0]?.lowerBound).toBe(
			"0.000000000000000000000000000001",
		);
		expect(distribution?.buckets[9]?.upperBound).toBe(
			"0.000000000000000000000000000002",
		);
		expect(distribution?.buckets.reduce((n, b) => n + b.headcount, 0)).toBe(2);
	});
	it("retains exact large totals and histogram edges", async () => {
		await insert(9007199254740990);
		await insert(9007199254740991);
		expect((await groups()).groups[0]?.summaries[0]).toMatchObject({
			total: "18014398509481981",
			median: "9007199254740991",
			p25: "9007199254740990",
			p75: "9007199254740991",
		});
		const buckets = (await histogram()).distributions[0]?.buckets;
		expect(buckets).toHaveLength(10);
		expect(buckets?.[0]?.lowerBound).toBe("9007199254740990");
		expect(buckets?.[9]?.upperBound).toBe("9007199254740991");
		expect(buckets?.reduce((n, b) => n + b.headcount, 0)).toBe(2);
	});
	it("includes a high outlier without discarding any employees", async () => {
		for (const amount of [4500000, 5000000, 5500000, 100000000])
			await insert(amount);
		const distribution = (await histogram()).distributions[0];
		expect(distribution?.buckets).toHaveLength(10);
		expect(distribution?.buckets.map((b) => b.headcount)).toEqual([
			3, 0, 0, 0, 0, 0, 0, 0, 0, 1,
		]);
	});
	it("shares missing-rate rules and excludes irrelevant currencies", async () => {
		await insert(100, "EUR");
		await insert(100, "USD");
		await database.connection.db
			.delete(fxRates)
			.where(eq(fxRates.sourceCurrencyCode, "EUR"));
		for (const path of [
			`${contract.getPayInsightsGroups.path}?groupBy=level&`,
			`${contract.getPayInsightsHistogram.path}?`,
		]) {
			const response = await fetch(`${url}${path}view=usd`);
			expect(response.status).toBe(422);
			expect(
				contract.getPayInsightsSummary.responses[422].parse(
					await response.json(),
				).message,
			).toContain("EUR");
		}
		expect((await groups({ view: "usd", currencyCode: "USD" })).headcount).toBe(
			1,
		);
		expect(
			(await histogram({ view: "usd", currencyCode: "USD" })).headcount,
		).toBe(1);
	});
	it("immediately reflects salary saves in groups and histograms", async () => {
		await insert(10000000);
		const edited = await insert(15000000);
		await insert(9000000, "EUR");
		expect(
			(await histogram({ currencyCode: "USD" })).distributions[0]?.buckets.at(
				-1,
			)?.upperBound,
		).toBe("15000000");
		const saved = await fetch(
			`${url}${contract.updateEmployeeSalary.path.replace(":id", edited.id)}`,
			{
				method: contract.updateEmployeeSalary.method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					version: edited.version,
					salaryMinorUnits: 16000000,
					currencyCode: "USD",
				}),
			},
		);
		expect(saved.status).toBe(200);
		expect((await groups()).groups[0]?.summaries).toMatchObject([
			{ currencyCode: "EUR", headcount: 1, total: "9000000" },
			{ currencyCode: "USD", headcount: 2, total: "26000000" },
		]);
		expect(
			(await groups({ view: "usd" })).groups[0]?.summaries[0],
		).toMatchObject({
			headcount: 3,
			total: "35900000",
			average: "11966667",
			median: "10000000",
		});
		const distribution = (await histogram({ currencyCode: "USD" }))
			.distributions[0];
		expect(distribution?.buckets.at(-1)?.upperBound).toBe("16000000");
		expect(distribution?.buckets.reduce((n, b) => n + b.headcount, 0)).toBe(2);
	});
	it("reports the full seed and records insights and directory timings", async () => {
		await seedEmployees(database.connection.db, generateEmployees());
		const timings: Record<string, number> = {};
		for (const view of ["local", "usd"]) {
			for (const groupBy of ["country", "department", "level", "jobTitle"]) {
				const started = performance.now();
				const report = await groups({ view, groupBy, status: "all" });
				timings[`${view} groups ${groupBy}`] = Math.round(
					performance.now() - started,
				);
				expect(report.headcount).toBe(10000);
				expect(report.groups.reduce((n, g) => n + g.headcount, 0)).toBe(10000);
				for (const group of report.groups)
					expect(group.summaries.reduce((n, s) => n + s.headcount, 0)).toBe(
						group.headcount,
					);
			}
			const started = performance.now();
			const report = await histogram({ view, status: "all" });
			timings[`${view} histogram`] = Math.round(performance.now() - started);
			expect(report.headcount).toBe(10000);
			expect(report.distributions.reduce((n, d) => n + d.headcount, 0)).toBe(
				10000,
			);
			for (const distribution of report.distributions)
				expect(distribution.buckets.reduce((n, b) => n + b.headcount, 0)).toBe(
					distribution.headcount,
				);
		}
		for (const search of ["", "EMP", "Alex", "NoSuchEmployee"]) {
			const started = performance.now();
			const response = await fetch(
				`${url}${contract.listEmployees.path}?pageSize=1&search=${search}`,
			);
			expect(response.status).toBe(200);
			const directory = contract.listEmployees.responses[200].parse(
				await response.json(),
			);
			timings[`directory search ${search || "(empty)"}`] = Math.round(
				performance.now() - started,
			);
			if (!search) expect(directory.total).toBe(10000);
		}
		console.info("10,000-employee report timings (ms)", timings);
	}, 30000);
});
