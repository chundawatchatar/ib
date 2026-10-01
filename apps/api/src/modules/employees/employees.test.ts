import { once } from "node:events";
import type { Server } from "node:http";
import { contract } from "@salary-manager/contracts";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createApp } from "../../app";
import { createTestServices } from "../../test-services";
import type { EmployeeService } from "./employees.service";

describe("directory HTTP contract", () => {
	const list = vi.fn<EmployeeService["list"]>();
	let server: Server;
	let url: string;
	beforeAll(async () => {
		server = createApp({
			services: {
				...createTestServices(),
				employees: { ...createTestServices().employees, list },
			},
			logger: { info: vi.fn(), error: vi.fn() },
		}).listen(0, "127.0.0.1");
		await once(server, "listening");
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing TCP address");
		url = `http://127.0.0.1:${address.port}${contract.listEmployees.path}`;
	});
	beforeEach(() => {
		list.mockReset();
		list.mockImplementation(async (query) => ({
			items: [],
			total: 0,
			page: query.page,
			pageSize: query.pageSize,
		}));
	});
	afterAll(async () => {
		if (server?.listening)
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
	});

	it("applies defaults and returns a validated bounded response", async () => {
		const response = await fetch(url);
		expect(response.status).toBe(200);
		expect(
			contract.listEmployees.responses[200].parse(await response.json()),
		).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
		expect(list).toHaveBeenCalledWith({
			page: 1,
			pageSize: 25,
			status: "all",
			sortBy: "name",
			sortDirection: "asc",
		});
	});

	it("parses numeric bounds and trims search before calling the service", async () => {
		const response = await fetch(
			`${url}?page=2&pageSize=5&currencyCode=USD&salaryMin=0&salaryMax=9007199254740991&search=%20Alex%20`,
		);
		expect(response.status).toBe(200);
		expect(list).toHaveBeenCalledWith(
			expect.objectContaining({
				page: 2,
				pageSize: 5,
				salaryMin: 0,
				salaryMax: Number.MAX_SAFE_INTEGER,
				search: "Alex",
			}),
		);
	});

	it.each([
		"page=0",
		"page=1000001",
		"page=",
		"page=1.5",
		"pageSize=101",
		"pageSize=-1",
		"salaryMin=100",
		"salaryMax=100",
		"currencyCode=USD&salaryMin=200&salaryMax=100",
		"currencyCode=USD&salaryMin=-1",
		"currencyCode=USD&salaryMin=9007199254740992",
		"countryCode=USA",
		"currencyCode=usd",
		"departmentId=invalid",
		"level=%20",
		"status=unknown",
		"sortBy=unknown",
		"sortDirection=up",
		"page=1&page=2",
		"search[name]=Alex",
		"extra=value",
		`search=${"x".repeat(201)}`,
		// Regression: NUL reached PostgreSQL and failed as a 500.
		"search=%00",
		"search=Al%00ex",
		"level=L1%00",
		"search=%1B",
	])("rejects invalid query %s before executing any service", async (query) => {
		const response = await fetch(`${url}?${query}`);
		expect(response.status).toBe(400);
		const body = contract.listEmployees.responses[400].parse(
			await response.json(),
		);
		expect(body.message).toBe("Invalid request");
		expect(body.issues).toEqual(
			expect.arrayContaining([expect.objectContaining({ location: "query" })]),
		);
		expect(list).not.toHaveBeenCalled();
	});

	it("returns a safe failure through the centralized error handler", async () => {
		list.mockRejectedValueOnce(new Error("private SQL details"));
		const response = await fetch(url);
		expect(response.status).toBe(500);
		expect(
			contract.listEmployees.responses[500].parse(await response.json()),
		).toEqual({ message: "Internal server error" });
	});
});
