import { once } from "node:events";
import type { Server } from "node:http";
import { apiErrorSchema, contract } from "@salary-manager/contracts";
import { RequestValidationError } from "@ts-rest/express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import type { HealthService } from "./modules/health/health.service";
import { createTestServices } from "./test-services";

describe("application middleware and controller boundaries", () => {
	let server: Server;
	let baseUrl: string;
	const logger = { info: vi.fn(), error: vi.fn() };
	const getHealth = vi.fn<HealthService["getHealth"]>();

	beforeEach(async () => {
		vi.resetAllMocks();
		getHealth.mockReturnValue({ status: "ok" });
		server = createApp({
			services: { ...createTestServices(), health: { getHealth } },
			logger,
		}).listen(0, "127.0.0.1");
		await once(server, "listening");
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("Expected TCP address");
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterEach(async () => {
		if (server?.listening) {
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
		}
	});

	it("uses the injected service and correlates responses with structured logs", async () => {
		const response = await fetch(
			`${baseUrl}${contract.health.path}?search=private`,
			{
				headers: { "x-request-id": "request_123" },
			},
		);
		expect(response.status).toBe(200);
		expect(contract.health.responses[200].parse(await response.json())).toEqual(
			{ status: "ok" },
		);
		expect(getHealth).toHaveBeenCalledOnce();
		expect(response.headers.get("x-request-id")).toBe("request_123");
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(response.headers.has("x-powered-by")).toBe(false);
		expect(logger.info).toHaveBeenCalledWith({
			event: "request.completed",
			requestId: "request_123",
			method: "GET",
			status: 200,
			durationMs: expect.any(Number),
		});
		expect(JSON.stringify(logger.info.mock.calls)).not.toContain("private");
	});

	it.each([undefined, "invalid id", "x".repeat(101)])(
		"generates an ID for missing or invalid client IDs: %s",
		async (id) => {
			const response = await fetch(`${baseUrl}/missing`, {
				headers: id === undefined ? {} : { "x-request-id": id },
			});
			expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
			expect(response.status).toBe(404);
			expect(apiErrorSchema.parse(await response.json())).toEqual({
				message: "Route not found",
			});
		},
	);

	it("returns a contract-shaped error for malformed JSON before calling the controller", async () => {
		const response = await fetch(`${baseUrl}${contract.health.path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: '{"salary":',
		});
		expect(response.status).toBe(400);
		expect(contract.health.responses[400].parse(await response.json())).toEqual(
			{ message: "Invalid JSON body" },
		);
		expect(getHealth).not.toHaveBeenCalled();
	});

	it("rejects bodies over the configured limit", async () => {
		const response = await fetch(`${baseUrl}${contract.health.path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ data: "x".repeat(65_536) }),
		});
		expect(response.status).toBe(413);
		expect(contract.health.responses[413].parse(await response.json())).toEqual(
			{ message: "Request body too large" },
		);
		expect(getHealth).not.toHaveBeenCalled();
	});

	it("maps ts-rest validation errors to the documented JSON shape", async () => {
		getHealth.mockImplementationOnce(() => {
			throw new RequestValidationError(null, null, null, null);
		});
		const response = await fetch(`${baseUrl}${contract.health.path}`);
		expect(response.status).toBe(400);
		expect(contract.health.responses[400].parse(await response.json())).toEqual(
			{ message: "Invalid request" },
		);
	});

	it("returns field-level issues for request validation failures", async () => {
		// Any contract schema yields a real ZodError for the request body.
		const body = apiErrorSchema.safeParse({ message: 42 });
		if (body.success) throw new Error("Expected invalid body");
		getHealth.mockImplementationOnce(() => {
			throw new RequestValidationError(null, null, null, body.error);
		});
		const response = await fetch(`${baseUrl}${contract.health.path}`);
		expect(response.status).toBe(400);
		expect(contract.health.responses[400].parse(await response.json())).toEqual(
			{
				message: "Invalid request",
				issues: [
					{
						location: "body",
						path: "message",
						message: expect.any(String),
					},
				],
			},
		);
	});

	// Regression: other JSON parser client errors were reported as 500s.
	it.each([
		[
			"an unsupported charset",
			{ "content-type": "application/json; charset=latin1" },
			"Unsupported request charset",
		],
		[
			"an unsupported encoding",
			{ "content-type": "application/json", "content-encoding": "br" },
			"Unsupported request encoding",
		],
	])(
		"returns 415 without logging a server failure for %s",
		async (_case, headers, message) => {
			const response = await fetch(`${baseUrl}${contract.health.path}`, {
				method: "POST",
				headers,
				body: "{}",
			});
			expect(response.status).toBe(415);
			expect(
				contract.health.responses[415].parse(await response.json()),
			).toEqual({ message });
			expect(logger.error).not.toHaveBeenCalled();
			expect(getHealth).not.toHaveBeenCalled();
		},
	);

	it("keeps the 4xx status of other exposed client errors", async () => {
		getHealth.mockImplementationOnce(() => {
			throw Object.assign(new Error("request aborted"), {
				status: 400,
				expose: true,
				type: "request.aborted",
			});
		});
		const response = await fetch(`${baseUrl}${contract.health.path}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ message: "Invalid request" });
		expect(logger.error).not.toHaveBeenCalled();
	});

	it("still treats unexposed errors with a 4xx status as server failures", async () => {
		getHealth.mockImplementationOnce(() => {
			throw Object.assign(new Error("internal"), { status: 404 });
		});
		const response = await fetch(`${baseUrl}${contract.health.path}`);
		expect(response.status).toBe(500);
		expect(logger.error).toHaveBeenCalledOnce();
	});

	it("handles rejected controllers without exposing error details", async () => {
		getHealth.mockImplementationOnce(() => {
			throw new Error("private database credentials");
		});
		const response = await fetch(`${baseUrl}${contract.health.path}`, {
			headers: { "x-request-id": "failure_123" },
		});
		expect(response.status).toBe(500);
		expect(contract.health.responses[500].parse(await response.json())).toEqual(
			{ message: "Internal server error" },
		);
		expect(logger.error).toHaveBeenCalledWith({
			event: "request.failed",
			requestId: "failure_123",
			method: "GET",
			status: 500,
		});
		expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
			"credentials",
		);
	});

	it("preserves runtime response validation", async () => {
		// Deliberately inject a broken service to exercise the HTTP response boundary.
		// @ts-expect-error Invalid status must be rejected at runtime too.
		getHealth.mockReturnValueOnce({ status: "broken" });
		const response = await fetch(`${baseUrl}${contract.health.path}`);
		expect(response.status).toBe(500);
		expect(contract.health.responses[500].parse(await response.json())).toEqual(
			{ message: "Internal server error" },
		);
	});
});
