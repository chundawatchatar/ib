import { once } from "node:events";
import type { Server } from "node:http";
import {
	apiErrorSchema,
	contract,
	type EmployeeResponse,
} from "@salary-manager/contracts";
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

const id = "00000000-0000-4000-8000-000000000001";
const profile = {
	code: "EMP001",
	name: "Alex Shah",
	countryCode: "US",
	departmentId: id,
	level: "L1",
	jobTitleId: id,
};
const createBody = {
	...profile,
	currencyCode: "USD",
	salaryMinorUnits: 10000000,
};
const employee: EmployeeResponse = {
	...createBody,
	id,
	countryName: "United States",
	departmentName: "Engineering",
	jobTitleName: "Engineer",
	currencyMinorUnits: 2,
	active: true,
	version: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("employee management HTTP contracts", () => {
	const service = {
		...createTestServices().employees,
		get: vi.fn<EmployeeService["get"]>(),
		create: vi.fn<EmployeeService["create"]>(),
		update: vi.fn<EmployeeService["update"]>(),
		deactivate: vi.fn<EmployeeService["deactivate"]>(),
	};
	let server: Server;
	let baseUrl: string;
	beforeAll(async () => {
		server = createApp({
			services: { ...createTestServices(), employees: service },
			logger: { info: vi.fn(), error: vi.fn() },
		}).listen(0, "127.0.0.1");
		await once(server, "listening");
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("Expected listener");
		baseUrl = `http://127.0.0.1:${address.port}`;
	});
	beforeEach(() => {
		vi.resetAllMocks();
		service.get.mockResolvedValue({ kind: "success", employee });
		service.create.mockResolvedValue({ kind: "success", employee });
		service.update.mockResolvedValue({ kind: "success", employee });
		service.deactivate.mockResolvedValue({ kind: "success", employee });
	});
	afterAll(async () => {
		if (server?.listening)
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
	});
	function request(path: string, method: string, body?: unknown) {
		return fetch(`${baseUrl}${path.replace(":id", id)}`, {
			method,
			...(body === undefined
				? {}
				: {
						headers: { "content-type": "application/json" },
						body: JSON.stringify(body),
					}),
		});
	}

	it("creates with trimmed fields and returns the declared 201 response", async () => {
		const response = await request(contract.createEmployee.path, "POST", {
			...createBody,
			name: "  Alex Shah  ",
		});
		expect(response.status).toBe(201);
		expect(
			contract.createEmployee.responses[201].parse(await response.json()),
		).toEqual(employee);
		expect(service.create).toHaveBeenCalledWith(createBody);
	});
	it("views, edits and deactivates through their typed service methods", async () => {
		const view = await request(contract.getEmployee.path, "GET");
		expect(view.status).toBe(200);
		expect(
			contract.getEmployee.responses[200].parse(await view.json()),
		).toEqual(employee);
		expect(service.get).toHaveBeenCalledWith(id);
		const update = await request(contract.updateEmployee.path, "PUT", {
			...profile,
			version: 1,
		});
		expect(update.status).toBe(200);
		expect(
			contract.updateEmployee.responses[200].parse(await update.json()),
		).toEqual(employee);
		expect(service.update).toHaveBeenCalledWith(id, { ...profile, version: 1 });
		const deactivate = await request(contract.deactivateEmployee.path, "POST", {
			version: 1,
		});
		expect(deactivate.status).toBe(200);
		expect(
			contract.deactivateEmployee.responses[200].parse(await deactivate.json()),
		).toEqual(employee);
		expect(service.deactivate).toHaveBeenCalledWith(id, 1);
	});

	it.each([
		{ name: " " },
		{ name: "Alex\u0000Shah" },
		{ name: "x".repeat(201) },
		{ code: "" },
		{ level: "\u001bL1" },
		{ countryCode: "USA" },
		{ currencyCode: "usd" },
		{ departmentId: "bad" },
		{ jobTitleId: "bad" },
		{ salaryMinorUnits: 0 },
		{ salaryMinorUnits: -1 },
		{ salaryMinorUnits: 1.5 },
		{ salaryMinorUnits: "100" },
		{ salaryMinorUnits: Number.MAX_SAFE_INTEGER + 1 },
		{ version: 1 },
		{ active: false },
		{ id },
	])(
		"rejects invalid creation fields %j before calling the service",
		async (invalid) => {
			const response = await request(contract.createEmployee.path, "POST", {
				...createBody,
				...invalid,
			});
			expect(response.status).toBe(400);
			expect(apiErrorSchema.parse(await response.json()).issues).toEqual(
				expect.arrayContaining([expect.objectContaining({ location: "body" })]),
			);
			expect(service.create).not.toHaveBeenCalled();
		},
	);
	it.each([
		{ version: 0 },
		{ version: "1" },
		{ version: 1.5 },
		{ version: 2_147_483_647 },
		{ salaryMinorUnits: 1 },
		{ currencyCode: "EUR" },
		{ active: false },
		{ name: "" },
	])("rejects invalid profile edits %j", async (invalid) => {
		const response = await request(contract.updateEmployee.path, "PUT", {
			...profile,
			version: 1,
			...invalid,
		});
		expect(response.status).toBe(400);
		expect(service.update).not.toHaveBeenCalled();
	});
	it("requires a complete profile and a version, and validates path IDs", async () => {
		for (const [path, method, body] of [
			[contract.updateEmployee.path, "PUT", profile],
			[contract.updateEmployee.path, "PUT", { version: 1, name: "Alex" }],
			[contract.deactivateEmployee.path, "POST", {}],
			[contract.deactivateEmployee.path, "POST", { version: 1, active: true }],
		] as const)
			expect((await request(path, method, body)).status).toBe(400);
		for (const [path, method, body] of [
			[contract.getEmployee.path, "GET", undefined],
			[contract.updateEmployee.path, "PUT", { ...profile, version: 1 }],
			[contract.deactivateEmployee.path, "POST", { version: 1 }],
		] as const) {
			const response = await request(
				path.replace(":id", "invalid"),
				method,
				body,
			);
			expect(response.status).toBe(400);
			expect(apiErrorSchema.parse(await response.json()).issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ location: "params", path: "id" }),
				]),
			);
		}
		expect(service.get).not.toHaveBeenCalled();
		expect(service.update).not.toHaveBeenCalled();
		expect(service.deactivate).not.toHaveBeenCalled();
	});
	it("maps missing records, reference errors and conflicts to declared responses", async () => {
		const error = { message: "Expected domain failure" };
		service.get.mockResolvedValueOnce({ kind: "notFound", error });
		service.create.mockResolvedValueOnce({ kind: "conflict", error });
		service.update.mockResolvedValueOnce({ kind: "invalid", error });
		service.deactivate.mockResolvedValueOnce({ kind: "conflict", error });
		const cases = [
			[contract.getEmployee.path, "GET", undefined, 404],
			[contract.createEmployee.path, "POST", createBody, 409],
			[contract.updateEmployee.path, "PUT", { ...profile, version: 1 }, 400],
			[contract.deactivateEmployee.path, "POST", { version: 1 }, 409],
		] as const;
		for (const [path, method, body, status] of cases) {
			const response = await request(path, method, body);
			expect(response.status).toBe(status);
			expect(apiErrorSchema.parse(await response.json())).toEqual(error);
		}
	});
});
