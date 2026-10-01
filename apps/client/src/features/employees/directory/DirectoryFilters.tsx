import type { ReferenceDataResponse } from "@salary-manager/contracts";
import { FormField, Input, SearchInput, Select } from "@salary-manager/ui";
import { type DirectorySearch, salaryBound } from "./directory-search";

type DirectoryFiltersProps = {
	search: DirectorySearch;
	reference: ReferenceDataResponse;
	onChange: (changes: Partial<DirectorySearch>) => void;
};

export function DirectoryFilters({
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
		<fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-4 lg:grid-cols-8 xl:grid-cols-1">
			<legend className="sr-only">Filter employees</legend>
			<FormField
				id="filter-search"
				label="Search"
				className="col-span-2 xl:col-span-1"
			>
				<SearchInput
					id="filter-search"
					placeholder="Name or employee code"
					defaultValue={search.search}
					onDebouncedChange={(value) =>
						onChange({ search: value.trim() || undefined })
					}
				/>
			</FormField>
			<FormField id="filter-country" label="Country">
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
			</FormField>
			<FormField id="filter-department" label="Department">
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
			</FormField>
			<FormField id="filter-level" label="Level">
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
			</FormField>
			<FormField id="filter-status" label="Status">
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
					<option value="">All statuses</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</Select>
			</FormField>
			<fieldset className="col-span-2 m-0 grid grid-cols-2 gap-x-3 gap-y-2 border-0 p-0 sm:col-span-4 sm:grid-cols-[repeat(3,minmax(0,12rem))] lg:col-span-8 xl:col-span-1 xl:grid-cols-2">
				<legend className="mb-1 p-0 text-sm font-semibold">Salary range</legend>
				<FormField
					id="filter-currency"
					label={<span className="sr-only">Currency</span>}
					className="col-span-2 sm:col-span-1 xl:col-span-2"
				>
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
				</FormField>
				<FormField
					id="filter-salary-min"
					label={<span className="sr-only">Salary from</span>}
				>
					<Input
						id="filter-salary-min"
						placeholder="Min"
						inputMode="decimal"
						disabled={!search.currencyCode}
						defaultValue={search.salaryMin}
						aria-invalid={minInvalid || undefined}
						aria-describedby="filter-salary-help"
						onDebouncedChange={(value) =>
							onChange({ salaryMin: value.trim() || undefined })
						}
					/>
				</FormField>
				<FormField
					id="filter-salary-max"
					label={<span className="sr-only">Salary to</span>}
				>
					<Input
						id="filter-salary-max"
						placeholder="Max"
						inputMode="decimal"
						disabled={!search.currencyCode}
						defaultValue={search.salaryMax}
						aria-invalid={maxInvalid || undefined}
						aria-describedby="filter-salary-help"
						onDebouncedChange={(value) =>
							onChange({ salaryMax: value.trim() || undefined })
						}
					/>
				</FormField>
				<p
					id="filter-salary-help"
					className={
						minInvalid || maxInvalid
							? "col-span-2 m-0 text-xs sm:col-span-3 xl:col-span-2 text-destructive"
							: "col-span-2 m-0 text-xs sm:col-span-3 xl:col-span-2 text-muted-foreground"
					}
				>
					{salaryRangeHelp}
				</p>
			</fieldset>
		</fieldset>
	);
}
