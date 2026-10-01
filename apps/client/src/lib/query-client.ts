import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api";

// Client errors (validation, not found, conflict) will not succeed on retry.
export function shouldRetry(failureCount: number, error: unknown): boolean {
	if (error instanceof ApiError && error.status < 500) return false;
	return failureCount < 2;
}

export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: { staleTime: 30_000, retry: shouldRetry },
			mutations: { retry: false },
		},
	});
}
