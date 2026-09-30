import { once } from "node:events";
import type { Server } from "node:http";
import { contract } from "@salary-manager/contracts";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "./app.js";

describe("HTTP API", () => {
	let server: Server;
	let baseUrl: string;

	beforeAll(async () => {
		server = app.listen(0, "127.0.0.1");
		await once(server, "listening");
		const address = server.address();
		if (address === null || typeof address === "string") {
			throw new Error("Expected a TCP server address");
		}
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	afterAll(async () => {
		if (server?.listening) {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		}
	});

	it("returns a healthy response matching the shared contract", async () => {
		const response = await fetch(`${baseUrl}${contract.health.path}`);
		const body: unknown = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(contract.health.responses[200].parse(body)).toEqual({
			status: "ok",
		});
	});

	it("returns 404 for an unknown endpoint", async () => {
		const response = await fetch(`${baseUrl}/api/unknown`);

		expect(response.status).toBe(404);
	});
});
