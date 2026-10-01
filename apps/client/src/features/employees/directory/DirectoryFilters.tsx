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
		<fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-4 lg:grid-cols-8">
			<legend className="sr-only">Filter employees</legend>
			<FormField id="filter-search" label="Search" className="col-span-2">
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
					<option value="">All</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</Select>
			</FormField>
			<FormField id="filter-currency" label="Currency">
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
			<fieldset className="col-span-2 m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:col-span-4 lg:col-span-2">
				<legend className="sr-only">Annual salary range</legend>
				<FormField id="filter-salary-min" label="Salary from">
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
				</FormField>
				<FormField id="filter-salary-max" label="Salary to">
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
				</FormField>
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
