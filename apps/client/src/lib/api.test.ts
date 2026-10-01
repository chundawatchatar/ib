import { describe, expect, it, vi } from "vitest";
import { ApiError, apiClient, unwrap } from "./api";

function jsonResponse(status: number, body: unknown): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("apiClient with unwrap", () => {
	it("returns the typed body from the same-origin API path", async () => {
		const fetchMock = vi.fn(async () => jsonResponse(200, { status: "ok" }));
		vi.stubGlobal("fetch", fetchMock);

		expect(unwrap(await apiClient.health(), 200)).toEqual({ status: "ok" });
		expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.anything());
	});

	it("throws an ApiError with status and field issues", async () => {
		const issues = [{ location: "body", path: "version", message: "Stale" }];
		vi.stubGlobal("fetch", async () =>
			jsonResponse(409, { message: "Employee changed", issues }),
		);
		const response = await apiClient.getEmployee({ params: { id: "42" } });

		expect(() => unwrap(response, 200)).toThrow(
			expect.objectContaining({
				status: 409,
				message: "Employee changed",
				issues,
			}),
		);
	});

	it("uses a generic message when the body is not an API error", () => {
		expect(() =>
			unwrap({ status: 502, body: "<html>Bad Gateway</html>" }, 200),
		).toThrow(new ApiError(502, "Request failed with status 502"));
	});
});
