import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createRouter as createTanStackRouter,
	type RouterHistory,
} from "@tanstack/react-router";
import { RouteError, RoutePending } from "./components/RouteStates";
import { createQueryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

export type RouterContext = {
	queryClient: QueryClient;
};

// Loaders prefetch with `context.queryClient`; components read the same cache.
// Tests pass their own query client and an in-memory history.
export function createAppRouter(
	queryClient: QueryClient = createQueryClient(),
	history?: RouterHistory,
) {
	return createTanStackRouter({
		routeTree,
		history,
		context: { queryClient } satisfies RouterContext,
		scrollRestoration: true,
		defaultPreload: "intent",
		// Query owns freshness; let preloads always run the loader.
		defaultPreloadStaleTime: 0,
		defaultPendingComponent: RoutePending,
		defaultErrorComponent: RouteError,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
}

export function getRouter() {
	return createAppRouter();
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
