import type { contract } from "@salary-manager/contracts";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { ClientInferRequest } from "@ts-rest/core";
import { apiClient, unwrap } from "#/lib/api";

export type DirectoryQuery = NonNullable<
	ClientInferRequest<typeof contract.listEmployees>["query"]
>;

export const employeeQueries = {
	all: () => ["employees"] as const,
	list: (query: DirectoryQuery) =>
		queryOptions({
			queryKey: [...employeeQueries.all(), "list", query],
			queryFn: async ({ signal }) =>
				unwrap(
					await apiClient.listEmployees({ query, fetchOptions: { signal } }),
					200,
				),
			placeholderData: keepPreviousData,
		}),
};
