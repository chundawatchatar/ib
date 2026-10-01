import type { contract } from "@salary-manager/contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { ClientInferRequest } from "@ts-rest/core";
import { apiClient, unwrap } from "#/lib/api";

export type InsightsQuery = NonNullable<
	ClientInferRequest<typeof contract.getPayInsightsSummary>["query"]
>;
export type GroupsQuery = NonNullable<
	ClientInferRequest<typeof contract.getPayInsightsGroups>["query"]
>;

// Employee mutations invalidate `all()`, so every report refreshes after a save.
export const insightQueries = {
	all: () => ["insights"] as const,
	summary: (query: InsightsQuery) =>
		queryOptions({
			queryKey: [...insightQueries.all(), "summary", query],
			queryFn: async ({ signal }) =>
				unwrap(
					await apiClient.getPayInsightsSummary({
						query,
						fetchOptions: { signal },
					}),
					200,
				),
			placeholderData: keepPreviousData,
		}),
	groups: (query: GroupsQuery) =>
		queryOptions({
			queryKey: [...insightQueries.all(), "groups", query],
			queryFn: async ({ signal }) =>
				unwrap(
					await apiClient.getPayInsightsGroups({
						query,
						fetchOptions: { signal },
					}),
					200,
				),
			placeholderData: keepPreviousData,
		}),
	histogram: (query: InsightsQuery) =>
		queryOptions({
			queryKey: [...insightQueries.all(), "histogram", query],
			queryFn: async ({ signal }) =>
				unwrap(
					await apiClient.getPayInsightsHistogram({
						query,
						fetchOptions: { signal },
					}),
					200,
				),
			placeholderData: keepPreviousData,
		}),
};
