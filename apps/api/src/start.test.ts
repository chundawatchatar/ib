import { once } from "node:events";
import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { parsePort, startApi } from "./start";

describe("API startup", () => {
	it("rejects missing and invalid database configuration", async () => {
		await expect(startApi("")).rejects.toThrow("DATABASE_URL is required");
		await expect(startApi("https://localhost/database")).rejects.toThrow(
			"PostgreSQL",
		);
	});
	it("fails before listening when PostgreSQL cannot establish a connection", async () => {
		// A local socket closes accepted connections, avoiding assumptions about unused ports.
		const unavailable = createServer((socket) => socket.destroy());
		unavailable.listen(0, "127.0.0.1");
		await once(unavailable, "listening");
		try {
			const address = unavailable.address();
			if (!address || typeof address === "string")
				throw new Error("Missing TCP address");
			await expect(
				startApi(`postgresql://test:test@127.0.0.1:${address.port}/test`, 0),
			).rejects.toThrow("API startup failed");
		} finally {
			await new Promise<void>((resolve, reject) =>
				unavailable.close((error) => (error ? reject(error) : resolve())),
			);
		}
	});
});

describe("PORT", () => {
	it("defaults to 3001 when unset or empty", () => {
		expect(parsePort(undefined)).toBe(3001);
		expect(parsePort("")).toBe(3001);
	});
	it("accepts a decimal port", () => {
		expect(parsePort("10000")).toBe(10000);
	});
	it.each(["abc", "-1", "1.5", " 80", "0x50", "65536"])(
		"rejects %j",
		(value) => {
			expect(() => parsePort(value)).toThrow("PORT must be an integer");
		},
	);
});
