import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { createQueryClient } from "#/lib/query-client";
import { createAppRouter } from "#/router";

export type ApiRequest = {
	method: string;
	url: URL;
	body: unknown;
};
type Reply = { status: number; body: unknown };
/** Returns the reply for a request, or undefined to answer 404. */
export type ApiHandler = (
	request: ApiRequest,
) => Reply | undefined | Promise<Reply | undefined>;

function jsonResponse({ status, body }: Reply): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

/**
 * Renders the real route tree at `path` with a fresh query cache (no retries)
 * and answers API calls from `handler`. Returns the recorded requests.
 */
export function renderApp(path: string, handler: ApiHandler) {
	const requests: ApiRequest[] = [];
	vi.stubGlobal("fetch", async (input: string, init: RequestInit = {}) => {
		const request: ApiRequest = {
			method: init.method ?? "GET",
			url: new URL(input, "http://localhost"),
			body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
		};
		requests.push(request);
		const reply = await handler(request);
		return jsonResponse(
			reply ?? { status: 404, body: { message: "Not found" } },
		);
	});
	const queryClient = createQueryClient();
	queryClient.setDefaultOptions({
		queries: { ...queryClient.getDefaultOptions().queries, retry: false },
	});
	const router = createAppRouter(
		queryClient,
		createMemoryHistory({ initialEntries: [path] }),
	);
	// The root route renders the whole document (<html>), so mount on document.
	render(<RouterProvider router={router} />, { container: document });
	return { requests, router, queryClient };
}
