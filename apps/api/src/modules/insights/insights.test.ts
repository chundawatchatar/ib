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
import type { InsightsService } from "./insights.service";

describe("insights HTTP contract", () => {
	const summary = vi.fn<InsightsService["summary"]>();
	const groups = vi.fn<InsightsService["groups"]>();
	const histogram = vi.fn<InsightsService["histogram"]>();
	let server: Server;
	let url: string;
	beforeAll(async () => {
		server = createApp({
			services: {
				...createTestServices(),
				insights: { summary, groups, histogram },
			},
			logger: { info: vi.fn(), error: vi.fn() },
		}).listen(0, "127.0.0.1");
		await once(server, "listening");
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing address");
		url = `http://127.0.0.1:${address.port}${contract.getPayInsightsSummary.path}`;
	});
	afterAll(async () => {
		if (server?.listening)
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
	});
	beforeEach(() => {
		groups.mockReset();
		histogram.mockReset();
		groups.mockImplementation(async (query) => ({
			kind: "success",
			report: {
				view: query.view,
				groupBy: query.groupBy,
				headcount: 0,
				rateDate: null,
				groups: [],
			},
		}));
		histogram.mockImplementation(async (query) => ({
			kind: "success",
			report: {
				view: query.view,
				headcount: 0,
				rateDate: null,
				distributions: [],
			},
		}));
		summary.mockReset();
		summary.mockResolvedValue({
			kind: "success",
			report: { view: "local", headcount: 0, rateDate: null, summaries: [] },
		});
	});
	it("defaults to active local reporting", async () => {
		const response = await fetch(url);
		expect(response.status).toBe(200);
		expect(
			contract.getPayInsightsSummary.responses[200].parse(
				await response.json(),
			),
		).toEqual({ view: "local", headcount: 0, rateDate: null, summaries: [] });
		expect(summary).toHaveBeenCalledWith({ status: "active", view: "local" });
	});
	it("parses all filters without pagination", async () => {
		const response = await fetch(
			`${url}?view=usd&status=all&currencyCode=USD&salaryMin=0&salaryMax=9007199254740991&search=%20Alex%20&countryCode=US&level=L1&departmentId=00000000-0000-4000-8000-000000000001`,
		);
		expect(response.status).toBe(200);
		expect(summary).toHaveBeenCalledWith({
			view: "usd",
			status: "all",
			currencyCode: "USD",
			salaryMin: 0,
			salaryMax: Number.MAX_SAFE_INTEGER,
			search: "Alex",
			countryCode: "US",
			level: "L1",
			departmentId: "00000000-0000-4000-8000-000000000001",
		});
	});
	it.each([
		"view=bad",
		"status=bad",
		"page=1",
		"pageSize=5",
		"sortBy=name",
		"extra=1",
		"salaryMin=1",
		"salaryMax=1",
		"currencyCode=USD&salaryMin=2&salaryMax=1",
		"currencyCode=USD&salaryMin=-1",
		"currencyCode=USD&salaryMax=9007199254740992",
		"countryCode=USA",
		"currencyCode=usd",
		"departmentId=no",
		"level=%20",
		"search=%00",
		"level=%1B",
		"view=usd&view=local",
		`search=${"x".repeat(201)}`,
	])("rejects %s before service execution", async (query) => {
		for (const endpoint of [
			url,
			`${url.replace("/summary", "/groups")}?groupBy=level`,
			url.replace("/summary", "/histogram"),
		]) {
			const response = await fetch(
				`${endpoint}${endpoint.includes("?") ? "&" : "?"}${query}`,
			);
			expect(response.status).toBe(400);
			const error = contract.getPayInsightsSummary.responses[400].parse(
				await response.json(),
			);
			expect(error.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ location: "query" }),
				]),
			);
			expect(summary).not.toHaveBeenCalled();
			expect(groups).not.toHaveBeenCalled();
			expect(histogram).not.toHaveBeenCalled();
		}
	});
	it("returns declared missing-rate errors", async () => {
		summary.mockResolvedValueOnce({
			kind: "invalid",
			error: { message: "Missing USD exchange rates for EUR at 2026-01-01" },
		});
		const response = await fetch(`${url}?view=usd`);
		expect(response.status).toBe(422);
		expect(
			contract.getPayInsightsSummary.responses[422].parse(
				await response.json(),
			),
		).toEqual({ message: "Missing USD exchange rates for EUR at 2026-01-01" });
	});
	it("hides unexpected failure details", async () => {
		summary.mockRejectedValueOnce(new Error("private SQL"));
		const response = await fetch(url);
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ message: "Internal server error" });
	});
	it("rejects malformed service responses", async () => {
		summary.mockResolvedValueOnce({
			kind: "success",
			report: { view: "local", headcount: -1, rateDate: null, summaries: [] },
		});
		expect((await fetch(url)).status).toBe(500);
	});
	it.each(["country", "department", "level", "jobTitle"])(
		"accepts grouping by %s with default filters",
		async (groupBy) => {
			const response = await fetch(
				`${url.replace("/summary", "/groups")}?groupBy=${groupBy}`,
			);
			expect(response.status).toBe(200);
			expect(
				contract.getPayInsightsGroups.responses[200].parse(
					await response.json(),
				),
			).toEqual({
				view: "local",
				rateDate: null,
				headcount: 0,
				groupBy,
				groups: [],
			});
			expect(groups).toHaveBeenCalledWith({
				groupBy,
				status: "active",
				view: "local",
			});
		},
	);
	it("defaults histogram to active local reporting", async () => {
		const response = await fetch(url.replace("/summary", "/histogram"));
		expect(response.status).toBe(200);
		expect(
			contract.getPayInsightsHistogram.responses[200].parse(
				await response.json(),
			),
		).toEqual({
			view: "local",
			rateDate: null,
			headcount: 0,
			distributions: [],
		});
		expect(histogram).toHaveBeenCalledWith({ status: "active", view: "local" });
	});
	it.each(["", "groupBy=currency", "groupBy=level&groupBy=country"])(
		"rejects missing or invalid groupBy: %s",
		async (query) => {
			const response = await fetch(
				`${url.replace("/summary", "/groups")}?${query}`,
			);
			expect(response.status).toBe(400);
			expect(
				contract.getPayInsightsGroups.responses[400].parse(
					await response.json(),
				).issues,
			).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ location: "query" }),
				]),
			);
			expect(groups).not.toHaveBeenCalled();
		},
	);
	it.each(["groups", "histogram"] as const)(
		"parses combined filters for %s",
		async (endpoint) => {
			const response = await fetch(
				`${url.replace("/summary", `/${endpoint}`)}?${endpoint === "groups" ? "groupBy=jobTitle&" : ""}view=usd&status=inactive&search=%20Alex%20&countryCode=US&departmentId=00000000-0000-4000-8000-000000000001&level=L2&currencyCode=USD&salaryMin=1&salaryMax=200`,
			);
			expect(response.status).toBe(200);
			expect(endpoint === "groups" ? groups : histogram).toHaveBeenCalledWith({
				view: "usd",
				status: "inactive",
				search: "Alex",
				countryCode: "US",
				departmentId: "00000000-0000-4000-8000-000000000001",
				level: "L2",
				currencyCode: "USD",
				salaryMin: 1,
				salaryMax: 200,
				...(endpoint === "groups" ? { groupBy: "jobTitle" } : {}),
			});
		},
	);
	it.each(["groups", "histogram"] as const)(
		"handles declared errors and unexpected failures for %s",
		async (endpoint) => {
			const mock = endpoint === "groups" ? groups : histogram;
			const endpointUrl =
				url.replace("/summary", `/${endpoint}`) +
				(endpoint === "groups" ? "?groupBy=level&view=usd" : "?view=usd");
			mock.mockResolvedValueOnce({
				kind: "invalid",
				error: { message: "Missing USD exchange rates for EUR" },
			});
			const missing = await fetch(endpointUrl);
			expect(missing.status).toBe(422);
			expect(await missing.json()).toEqual({
				message: "Missing USD exchange rates for EUR",
			});
			mock.mockRejectedValueOnce(new Error("private SQL"));
			const failed = await fetch(endpointUrl);
			expect(failed.status).toBe(500);
			expect(await failed.json()).toEqual({ message: "Internal server error" });
		},
	);
	it("returns a declared group-limit error", async () => {
		groups.mockResolvedValueOnce({
			kind: "invalid",
			error: {
				message: "Report exceeds the limit of 1,000,000 populated groups",
			},
		});
		expect(
			(await fetch(`${url.replace("/summary", "/groups")}?groupBy=level`))
				.status,
		).toBe(422);
	});
	it("rejects malformed group and histogram responses", async () => {
		groups.mockResolvedValueOnce({
			kind: "success",
			report: {
				view: "local",
				groupBy: "level",
				rateDate: null,
				headcount: -1,
				groups: [],
			},
		});
		histogram.mockResolvedValueOnce({
			kind: "success",
			report: {
				view: "local",
				rateDate: null,
				headcount: 1,
				distributions: [
					{
						currencyCode: "USD",
						currencyMinorUnits: 2,
						headcount: 1,
						buckets: [
							{
								lowerBound: "NaN",
								upperBound: "10",
								upperInclusive: true,
								headcount: 1,
							},
						],
					},
				],
			},
		});
		expect(
			(await fetch(`${url.replace("/summary", "/groups")}?groupBy=level`))
				.status,
		).toBe(500);
		expect((await fetch(url.replace("/summary", "/histogram"))).status).toBe(
			500,
		);
	});
});
