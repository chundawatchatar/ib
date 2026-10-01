import { contract } from "@salary-manager/contracts";
import { departments, employees, jobTitles } from "@salary-manager/domain";
import {
	createTestDatabase,
	type TestDatabase,
} from "@salary-manager/domain/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startApi } from "../../start";

describe("reference data against PostgreSQL", () => {
	let database: TestDatabase;
	let runtime: Awaited<ReturnType<typeof startApi>>;
	let url: string;
	beforeEach(async () => {
		database = await createTestDatabase();
		runtime = await startApi(database.databaseUrl, 0, "127.0.0.1");
		const address = runtime.server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing address");
		url = `http://127.0.0.1:${address.port}${contract.getReferenceData.path}`;
	}, 30000);
	afterEach(async () => {
		try {
			if (runtime) await runtime.close();
		} finally {
			if (database) await database.drop();
		}
	});

	async function read() {
		const response = await fetch(url);
		expect(response.status).toBe(200);
		return contract.getReferenceData.responses[200].parse(
			await response.json(),
		);
	}

	it("returns the master data installed by migrations", async () => {
		const data = await read();

		expect(data.countries.map((country) => country.code)).toContain("US");
		expect(data.currencies).toContainEqual(
			expect.objectContaining({ code: "JPY", minorUnits: 0 }),
		);
		expect(data.departments.length).toBeGreaterThan(0);
		expect(data.jobTitles.length).toBeGreaterThan(0);
		expect(data.levels).toEqual([]);
	});

	it("lists each level in use once, in natural order", async () => {
		const db = database.connection.db;
		const [department] = await db.select().from(departments).limit(1);
		const [title] = await db.select().from(jobTitles).limit(1);
		if (!department || !title) throw new Error("Missing master data");
		await db.insert(employees).values(
			["L10", "L2", "L2", "L1"].map((level, index) => ({
				code: `EMP${index}`,
				name: "Alex",
				countryCode: "US",
				currencyCode: "USD",
				departmentId: department.id,
				jobTitleId: title.id,
				level,
				salaryMinorUnits: 100_000_00,
				active: index !== 0,
			})),
		);

		expect((await read()).levels).toEqual(["L1", "L2", "L10"]);
	});
});
