import type {
	CreateEmployeeRequest,
	contract,
	DeactivateEmployeeRequest,
	UpdateEmployeeRequest,
	UpdateEmployeeSalaryRequest,
} from "@salary-manager/contracts";
import {
	keepPreviousData,
	type QueryClient,
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import type { ClientInferRequest } from "@ts-rest/core";
import { apiClient, unwrap } from "#/lib/api";
import { insightQueries } from "../insights/api";
import { referenceDataQuery } from "../reference-data/api";

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
	detail: (id: string) =>
		queryOptions({
			queryKey: [...employeeQueries.all(), "detail", id],
			queryFn: async ({ signal }) =>
				unwrap(
					await apiClient.getEmployee({
						params: { id },
						fetchOptions: { signal },
					}),
					200,
				),
		}),
};

// Any employee write can change the directory, every report, and the levels
// in use. Returning the promise keeps the mutation pending until data is fresh.
function refreshAfterEmployeeChange(queryClient: QueryClient) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: employeeQueries.all() }),
		queryClient.invalidateQueries({ queryKey: insightQueries.all() }),
		queryClient.invalidateQueries({ queryKey: referenceDataQuery.queryKey }),
	]);
}

export function useCreateEmployee() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: CreateEmployeeRequest) =>
			unwrap(await apiClient.createEmployee({ body }), 201),
		onSuccess: () => refreshAfterEmployeeChange(queryClient),
	});
}

export function useUpdateEmployee(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: UpdateEmployeeRequest) =>
			unwrap(await apiClient.updateEmployee({ params: { id }, body }), 200),
		onSuccess: () => refreshAfterEmployeeChange(queryClient),
	});
}

export function useUpdateSalary(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: UpdateEmployeeSalaryRequest) =>
			unwrap(
				await apiClient.updateEmployeeSalary({ params: { id }, body }),
				200,
			),
		onSuccess: () => refreshAfterEmployeeChange(queryClient),
	});
}

export function useDeactivateEmployee(id: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: DeactivateEmployeeRequest) =>
			unwrap(await apiClient.deactivateEmployee({ params: { id }, body }), 200),
		onSuccess: () => refreshAfterEmployeeChange(queryClient),
	});
}
