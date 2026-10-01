import type { EmployeeDirectoryItem } from "@salary-manager/contracts";
import {
	Badge,
	Button,
	type ColumnDef,
	DataGrid,
	type SortingState,
} from "@salary-manager/ui";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useState } from "react";
import { referenceDataQuery } from "#/features/reference-data/api";
import { errorMessage } from "#/lib/api";
import { money } from "#/lib/format";
import { employeeQueries } from "../api";
import { DirectoryFilters } from "./DirectoryFilters";
import {
	type DirectorySearch,
	hasFilters,
	PAGE_SIZE,
	type SortField,
	sortFields,
	toDirectoryQuery,
} from "./directory-search";

const route = getRouteApi("/employees/");

const columns: ColumnDef<EmployeeDirectoryItem>[] = [
	{
		id: "name",
		accessorKey: "name",
		header: "Name",
		cell: ({ row: { original } }) => (
			<Link
				to="/employees/$employeeId"
				params={{ employeeId: original.id }}
				className="font-medium"
			>
				{original.name}
			</Link>
		),
	},
	{ id: "code", accessorKey: "code", header: "Code" },
	{ id: "country", accessorKey: "countryName", header: "Country" },
	{ id: "department", accessorKey: "departmentName", header: "Department" },
	{
		id: "jobTitle",
		accessorKey: "jobTitleName",
		header: "Job title",
		enableSorting: false,
	},
	{ id: "level", accessorKey: "level", header: "Level" },
	{
		id: "salary",
		accessorKey: "salaryMinorUnits",
		header: "Salary",
		meta: { align: "right" },
		cell: ({ row: { original } }) =>
			money(
				original.salaryMinorUnits,
				original.currencyCode,
				original.currencyMinorUnits,
			),
	},
	{
		id: "status",
		header: "Status",
		enableSorting: false,
		cell: ({ row: { original } }) =>
			original.active ? "Active" : <Badge variant="secondary">Inactive</Badge>,
	},
];

function isSortField(id: string): id is SortField {
	return sortFields.some((field) => field === id);
}

export function EmployeeDirectory() {
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const { data: reference } = useSuspenseQuery(referenceDataQuery);
	const employees = useQuery(
		employeeQueries.list(toDirectoryQuery(search, reference.currencies)),
	);
	// Remounts the filter inputs so their typed text clears with the URL.
	const [resetKey, setResetKey] = useState(0);

	const setSearch = (changes: Partial<DirectorySearch>) =>
		navigate({
			search: (previous) => ({ ...previous, ...changes, page: undefined }),
			replace: true,
		});
	// Remount after the URL changes, so inputs read the cleared values.
	const clearFilters = () =>
		navigate({ search: {} }).then(() => setResetKey((key) => key + 1));

	const sorting: SortingState = [
		{ id: search.sortBy ?? "name", desc: search.sortDirection === "desc" },
	];

	return (
		<div className="flex flex-col gap-4">
			<DirectoryFilters
				key={resetKey}
				search={search}
				reference={reference}
				onChange={setSearch}
			/>
			{hasFilters(search) && (
				<Button
					variant="secondary"
					size="sm"
					className="self-start"
					onClick={clearFilters}
				>
					Clear filters
				</Button>
			)}
			<DataGrid
				label="Employees"
				columns={columns}
				data={employees.data?.items ?? []}
				getRowId={(employee) => employee.id}
				isLoading={employees.isPending}
				isFetching={employees.isPlaceholderData}
				error={
					employees.isError
						? errorMessage(employees.error, "Couldn't load employees.")
						: undefined
				}
				onRetry={() => employees.refetch()}
				emptyMessage={
					hasFilters(search)
						? "No employees match these filters. Clear them to see everyone."
						: "No employees yet."
				}
				manualPagination
				rowCount={employees.data?.total ?? 0}
				pagination={{ pageIndex: (search.page ?? 1) - 1, pageSize: PAGE_SIZE }}
				onPaginationChange={(updater) => {
					const current = {
						pageIndex: (search.page ?? 1) - 1,
						pageSize: PAGE_SIZE,
					};
					const next =
						typeof updater === "function" ? updater(current) : updater;
					navigate({
						search: (previous) => ({
							...previous,
							page: next.pageIndex > 0 ? next.pageIndex + 1 : undefined,
						}),
					});
				}}
				sorting={sorting}
				onSortingChange={(updater) => {
					const [next] =
						typeof updater === "function" ? updater(sorting) : updater;
					navigate({
						search: (previous) => ({
							...previous,
							page: undefined,
							sortBy: next && isSortField(next.id) ? next.id : undefined,
							sortDirection: next?.desc ? "desc" : undefined,
						}),
					});
				}}
			/>
		</div>
	);
}
