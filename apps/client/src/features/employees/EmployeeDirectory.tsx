import type {
	EmployeeDirectoryItem,
	ReferenceDataResponse,
} from "@salary-manager/contracts";
import {
	Badge,
	Button,
	type ColumnDef,
	DataGrid,
	Input,
	Label,
	SearchInput,
	Select,
	type SortingState,
} from "@salary-manager/ui";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { errorMessage } from "#/lib/api";
import { money } from "#/lib/format";
import { referenceDataQuery } from "../reference-data/api";
import { employeeQueries } from "./api";
import {
	type DirectorySearch,
	hasFilters,
	PAGE_SIZE,
	type SortField,
	salaryBound,
	sortFields,
	toDirectoryQuery,
} from "./directory-search";

const route = getRouteApi("/employees/");

const columns: ColumnDef<EmployeeDirectoryItem>[] = [
	{ id: "name", accessorKey: "name", header: "Name" },
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

type DirectoryFiltersProps = {
	search: DirectorySearch;
	reference: ReferenceDataResponse;
	onChange: (changes: Partial<DirectorySearch>) => void;
};

function DirectoryFilters({
	search,
	reference,
	onChange,
}: DirectoryFiltersProps) {
	const salaryError = (value: string | undefined) =>
		value !== undefined &&
		search.currencyCode !== undefined &&
		salaryBound(value, search.currencyCode, reference.currencies) === undefined;
	const minInvalid = salaryError(search.salaryMin);
	const maxInvalid = salaryError(search.salaryMax);
	const salaryRangeHelp = search.currencyCode
		? minInvalid || maxInvalid
			? `Enter an amount in ${search.currencyCode}, such as 85000.`
			: undefined
		: "Choose a currency to filter by salary.";

	return (
		<fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-4 lg:grid-cols-8">
			<legend className="sr-only">Filter employees</legend>
			<Field id="filter-search" label="Search" className="col-span-2">
				<SearchInput
					id="filter-search"
					placeholder="Name or employee code"
					defaultValue={search.search}
					onDebouncedChange={(value) =>
						onChange({ search: value.trim() || undefined })
					}
				/>
			</Field>
			<Field id="filter-country" label="Country">
				<Select
					id="filter-country"
					value={search.countryCode ?? ""}
					onChange={(event) =>
						onChange({ countryCode: event.target.value || undefined })
					}
				>
					<option value="">All countries</option>
					{reference.countries.map((country) => (
						<option key={country.code} value={country.code}>
							{country.name}
						</option>
					))}
				</Select>
			</Field>
			<Field id="filter-department" label="Department">
				<Select
					id="filter-department"
					value={search.departmentId ?? ""}
					onChange={(event) =>
						onChange({ departmentId: event.target.value || undefined })
					}
				>
					<option value="">All departments</option>
					{reference.departments.map((department) => (
						<option key={department.id} value={department.id}>
							{department.name}
						</option>
					))}
				</Select>
			</Field>
			<Field id="filter-level" label="Level">
				<Select
					id="filter-level"
					value={search.level ?? ""}
					onChange={(event) =>
						onChange({ level: event.target.value || undefined })
					}
				>
					<option value="">All levels</option>
					{reference.levels.map((level) => (
						<option key={level} value={level}>
							{level}
						</option>
					))}
				</Select>
			</Field>
			<Field id="filter-status" label="Status">
				<Select
					id="filter-status"
					value={search.status ?? ""}
					onChange={(event) => {
						const value = event.target.value;
						onChange({
							status:
								value === "active" || value === "inactive" ? value : undefined,
						});
					}}
				>
					<option value="">All</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</Select>
			</Field>
			<Field id="filter-currency" label="Currency">
				<Select
					id="filter-currency"
					value={search.currencyCode ?? ""}
					onChange={(event) => {
						const currencyCode = event.target.value || undefined;
						onChange(
							currencyCode
								? { currencyCode }
								: {
										currencyCode,
										salaryMin: undefined,
										salaryMax: undefined,
									},
						);
					}}
				>
					<option value="">All currencies</option>
					{reference.currencies.map((currency) => (
						<option key={currency.code} value={currency.code}>
							{currency.code}
						</option>
					))}
				</Select>
			</Field>
			<fieldset className="col-span-2 m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:col-span-4 lg:col-span-2">
				<legend className="sr-only">Annual salary range</legend>
				<Field id="filter-salary-min" label="Salary from">
					<Input
						id="filter-salary-min"
						inputMode="decimal"
						disabled={!search.currencyCode}
						defaultValue={search.salaryMin}
						aria-invalid={minInvalid || undefined}
						aria-describedby="filter-salary-help"
						onDebouncedChange={(value) =>
							onChange({ salaryMin: value.trim() || undefined })
						}
					/>
				</Field>
				<Field id="filter-salary-max" label="Salary to">
					<Input
						id="filter-salary-max"
						inputMode="decimal"
						disabled={!search.currencyCode}
						defaultValue={search.salaryMax}
						aria-invalid={maxInvalid || undefined}
						aria-describedby="filter-salary-help"
						onDebouncedChange={(value) =>
							onChange({ salaryMax: value.trim() || undefined })
						}
					/>
				</Field>
				<p
					id="filter-salary-help"
					className={
						minInvalid || maxInvalid
							? "col-span-2 m-0 text-xs text-destructive"
							: "col-span-2 m-0 text-xs text-muted-foreground"
					}
				>
					{salaryRangeHelp}
				</p>
			</fieldset>
		</fieldset>
	);
}

function Field({
	id,
	label,
	className,
	children,
}: {
	id: string;
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={
				className ? `flex flex-col gap-1 ${className}` : "flex flex-col gap-1"
			}
		>
			<Label htmlFor={id}>{label}</Label>
			{children}
		</div>
	);
}
