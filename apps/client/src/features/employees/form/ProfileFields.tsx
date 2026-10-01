import type { ReferenceDataResponse } from "@salary-manager/contracts";
import { FormField, Input, Select } from "@salary-manager/ui";
import { useFormContext } from "react-hook-form";
import { controlProps } from "#/lib/form";
import type { ProfileValues } from "./employee-form";

type ProfileFieldValues = Omit<ProfileValues, "version">;

type ProfileFieldsProps = {
	reference: ReferenceDataResponse;
	/** Called after the country changes, such as to suggest its currency. */
	onCountryChange?: (countryCode: string) => void;
};

/** Profile inputs shared by the create and edit forms (inside a FormProvider). */
export function ProfileFields({
	reference,
	onCountryChange,
}: ProfileFieldsProps) {
	const {
		register,
		formState: { errors },
	} = useFormContext<ProfileFieldValues>();
	const error = (field: keyof ProfileFieldValues) => errors[field]?.message;

	return (
		<>
			<FormField id="employee-name" label="Full name" error={error("name")}>
				<Input
					{...controlProps("employee-name", error("name"))}
					autoComplete="off"
					{...register("name")}
				/>
			</FormField>
			<FormField id="employee-code" label="Employee code" error={error("code")}>
				<Input
					{...controlProps("employee-code", error("code"))}
					autoComplete="off"
					{...register("code")}
				/>
			</FormField>
			<FormField
				id="employee-country"
				label="Country"
				error={error("countryCode")}
			>
				<Select
					{...controlProps("employee-country", error("countryCode"))}
					{...register("countryCode", {
						onChange: (event) => onCountryChange?.(event.target.value),
					})}
				>
					<option value="">Choose a country</option>
					{reference.countries.map((country) => (
						<option key={country.code} value={country.code}>
							{country.name}
						</option>
					))}
				</Select>
			</FormField>
			<FormField
				id="employee-department"
				label="Department"
				error={error("departmentId")}
			>
				<Select
					{...controlProps("employee-department", error("departmentId"))}
					{...register("departmentId")}
				>
					<option value="">Choose a department</option>
					{reference.departments.map((department) => (
						<option key={department.id} value={department.id}>
							{department.name}
						</option>
					))}
				</Select>
			</FormField>
			<FormField
				id="employee-job-title"
				label="Job title"
				error={error("jobTitleId")}
			>
				<Select
					{...controlProps("employee-job-title", error("jobTitleId"))}
					{...register("jobTitleId")}
				>
					<option value="">Choose a job title</option>
					{reference.jobTitles.map((title) => (
						<option key={title.id} value={title.id}>
							{title.name}
						</option>
					))}
				</Select>
			</FormField>
			<FormField id="employee-level" label="Level" error={error("level")}>
				<Input
					{...controlProps("employee-level", error("level"))}
					list="employee-levels"
					autoComplete="off"
					{...register("level")}
				/>
				<datalist id="employee-levels">
					{reference.levels.map((level) => (
						<option key={level} value={level} />
					))}
				</datalist>
			</FormField>
		</>
	);
}
