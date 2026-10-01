import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { createQueryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

export type RouterContext = {
	queryClient: QueryClient;
};

// Loaders prefetch with `context.queryClient`; components read the same cache.
export function getRouter() {
	const queryClient = createQueryClient();
	const router = createTanStackRouter({
		routeTree,
		context: { queryClient } satisfies RouterContext,
		scrollRestoration: true,
		defaultPreload: "intent",
		// Query owns freshness; let preloads always run the loader.
		defaultPreloadStaleTime: 0,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
