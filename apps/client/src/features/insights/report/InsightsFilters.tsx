import type { ReferenceDataResponse } from "@salary-manager/contracts";
import { FormField, Select } from "@salary-manager/ui";
import type { InsightsSearch } from "./insights-search";

type InsightsFiltersProps = {
	search: InsightsSearch;
	reference: ReferenceDataResponse;
	onChange: (changes: Partial<InsightsSearch>) => void;
};

export function InsightsFilters({
	search,
	reference,
	onChange,
}: InsightsFiltersProps) {
	return (
		<fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-4">
			<legend className="sr-only">Filter the population</legend>
			<FormField id="insights-country" label="Country">
				<Select
					id="insights-country"
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
			<FormField id="insights-department" label="Department">
				<Select
					id="insights-department"
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
			<FormField id="insights-level" label="Level">
				<Select
					id="insights-level"
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
			<FormField id="insights-status" label="Employees">
				<Select
					id="insights-status"
					value={search.status ?? "active"}
					onChange={(event) => {
						const value = event.target.value;
						onChange({
							status:
								value === "all" || value === "inactive" ? value : undefined,
						});
					}}
				>
					<option value="active">Active</option>
					<option value="all">Active and inactive</option>
					<option value="inactive">Inactive</option>
				</Select>
			</FormField>
		</fieldset>
	);
}
