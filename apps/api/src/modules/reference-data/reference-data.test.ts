import { once } from "node:events";
import type { Server } from "node:http";
import { contract } from "@salary-manager/contracts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { createTestServices } from "../../test-services";
import type { ReferenceDataService } from "./reference-data.service";

describe("reference data HTTP contract", () => {
	const get = vi.fn<ReferenceDataService["get"]>();
	let server: Server;
	let url: string;
	beforeAll(async () => {
		server = createApp({
			services: { ...createTestServices(), referenceData: { get } },
			logger: { info: vi.fn(), error: vi.fn() },
		}).listen(0, "127.0.0.1");
		await once(server, "listening");
		const address = server.address();
		if (!address || typeof address === "string")
			throw new Error("Missing address");
		url = `http://127.0.0.1:${address.port}${contract.getReferenceData.path}`;
	});
	afterAll(async () => {
		if (server?.listening)
			await new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			);
	});

	it("returns the service's reference data", async () => {
		const data = {
			countries: [{ code: "JP", name: "Japan", defaultCurrencyCode: "JPY" }],
			currencies: [{ code: "JPY", name: "Japanese yen", minorUnits: 0 }],
			departments: [
				{ id: "00000000-0000-4000-8000-000000000001", name: "Engineering" },
			],
			jobTitles: [
				{ id: "00000000-0000-4000-8000-000000000002", name: "Engineer" },
			],
			levels: ["L2", "L10"],
		};
		get.mockResolvedValueOnce(data);

		const response = await fetch(url);

		expect(response.status).toBe(200);
		expect(
			contract.getReferenceData.responses[200].parse(await response.json()),
		).toEqual(data);
	});

	it("hides unexpected failures behind a generic 500", async () => {
		get.mockRejectedValueOnce(new Error("connection refused"));

		const response = await fetch(url);

		expect(response.status).toBe(500);
		expect(await response.text()).not.toContain("connection refused");
	});
});
