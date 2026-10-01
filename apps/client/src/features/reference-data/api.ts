import { queryOptions } from "@tanstack/react-query";
import { apiClient, unwrap } from "#/lib/api";

// Master data changes only through migrations; levels change when an employee
// is saved with a new one, so employee mutations invalidate this query.
export const referenceDataQuery = queryOptions({
	queryKey: ["reference-data"],
	queryFn: async ({ signal }) =>
		unwrap(await apiClient.getReferenceData({ fetchOptions: { signal } }), 200),
	staleTime: Number.POSITIVE_INFINITY,
});
