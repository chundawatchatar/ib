import { zodResolver } from "@hookform/resolvers/zod";
import type { ReferenceDataResponse } from "@salary-manager/contracts";
import { Alert, Button, FormField, Input, Select } from "@salary-manager/ui";
import { useNavigate } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import {
	controlProps,
	saveErrorMessage,
	setServerFieldErrors,
} from "#/lib/form";
import { useCreateEmployee } from "../api";
import {
	type CreateEmployeeValues,
	createEmployeeSchema,
	emptyEmployee,
} from "./employee-form";
import { ProfileFields } from "./ProfileFields";

const fields = Object.keys(emptyEmployee) as (keyof CreateEmployeeValues)[];

export function CreateEmployeeForm({
	reference,
}: {
	reference: ReferenceDataResponse;
}) {
	const navigate = useNavigate();
	const createEmployee = useCreateEmployee();
	const form = useForm({
		resolver: zodResolver(createEmployeeSchema(reference.currencies)),
		defaultValues: emptyEmployee,
	});
	const {
		register,
		getValues,
		setValue,
		formState: { errors },
	} = form;

	const onSubmit = form.handleSubmit(async (body) => {
		try {
			const employee = await createEmployee.mutateAsync(body);
			await navigate({
				to: "/employees/$employeeId",
				params: { employeeId: employee.id },
				replace: true,
			});
		} catch (error) {
			setServerFieldErrors(error, form.setError, (path) =>
				path === "salaryMinorUnits"
					? "salary"
					: fields.find((field) => field === path),
			);
		}
	});

	// Suggest the country's usual currency until one is chosen.
	const suggestCurrency = (countryCode: string) => {
		const country = reference.countries.find(
			(item) => item.code === countryCode,
		);
		if (!getValues("currencyCode") && country?.defaultCurrencyCode)
			setValue("currencyCode", country.defaultCurrencyCode);
	};

	return (
		<FormProvider {...form}>
			<form
				noValidate
				aria-label="New employee"
				onSubmit={onSubmit}
				className="flex max-w-2xl flex-col gap-4"
			>
				{createEmployee.isError && (
					<Alert variant="destructive">
						{saveErrorMessage(createEmployee.error)}
					</Alert>
				)}
				<div className="grid gap-4 sm:grid-cols-2">
					<ProfileFields
						reference={reference}
						onCountryChange={suggestCurrency}
					/>
					<FormField
						id="employee-currency"
						label="Salary currency"
						error={errors.currencyCode?.message}
					>
						<Select
							{...controlProps(
								"employee-currency",
								errors.currencyCode?.message,
							)}
							{...register("currencyCode")}
						>
							<option value="">Choose a currency</option>
							{reference.currencies.map((currency) => (
								<option key={currency.code} value={currency.code}>
									{currency.code}, {currency.name}
								</option>
							))}
						</Select>
					</FormField>
					<FormField
						id="employee-salary"
						label="Annual base salary"
						error={errors.salary?.message}
					>
						<Input
							{...controlProps("employee-salary", errors.salary?.message)}
							inputMode="decimal"
							autoComplete="off"
							{...register("salary")}
						/>
					</FormField>
				</div>
				<div className="flex gap-3">
					<Button type="submit" disabled={createEmployee.isPending}>
						{createEmployee.isPending ? "Adding…" : "Add employee"}
					</Button>
					<Button
						variant="ghost"
						onClick={() => navigate({ to: "/employees" })}
					>
						Cancel
					</Button>
				</div>
			</form>
		</FormProvider>
	);
}
