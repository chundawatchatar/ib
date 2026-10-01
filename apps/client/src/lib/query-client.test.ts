import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { shouldRetry } from "./query-client";

describe("shouldRetry", () => {
	it("does not retry client errors", () => {
		expect(shouldRetry(0, new ApiError(404, "Not found"))).toBe(false);
		expect(shouldRetry(0, new ApiError(409, "Conflict"))).toBe(false);
	});

	it("retries server and network errors twice", () => {
		expect(shouldRetry(0, new ApiError(503, "Unavailable"))).toBe(true);
		expect(shouldRetry(1, new TypeError("Failed to fetch"))).toBe(true);
		expect(shouldRetry(2, new TypeError("Failed to fetch"))).toBe(false);
	});
});
