import { zodResolver } from "@hookform/resolvers/zod";
import type { ReferenceDataResponse } from "@salary-manager/contracts";
import {
	Alert,
	Button,
	Card,
	CardFooter,
	CardTitle,
	cn,
	FormField,
	Input,
	Select,
} from "@salary-manager/ui";
import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
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
			<Card>
				<form noValidate aria-label="New employee" onSubmit={onSubmit}>
					{createEmployee.isError && (
						<Alert variant="destructive" className="m-5 mb-0">
							{saveErrorMessage(createEmployee.error)}
						</Alert>
					)}
					<FormSection
						title="Profile"
						description="Who they are and where they sit in the organisation."
					>
						<ProfileFields
							reference={reference}
							onCountryChange={suggestCurrency}
						/>
					</FormSection>
					<FormSection
						title="Salary"
						description="Their starting annual base salary. Choosing a country suggests its usual currency."
						className="border-t border-border"
					>
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
								placeholder="e.g. 85000"
								{...register("salary")}
							/>
						</FormField>
					</FormSection>
					<CardFooter className="justify-end border-t border-border">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => navigate({ to: "/employees" })}
						>
							Cancel
						</Button>
						<Button type="submit" size="sm" disabled={createEmployee.isPending}>
							{createEmployee.isPending ? "Adding…" : "Add employee"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</FormProvider>
	);
}

/** A titled group of fields in two columns, separated within the card. */
function FormSection({
	title,
	description,
	className,
	children,
}: {
	title: string;
	description: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section className={cn("flex flex-col gap-4 p-5", className)}>
			<div className="flex flex-col gap-1">
				<CardTitle className="text-base">{title}</CardTitle>
				<p className="m-0 text-sm text-muted-foreground">{description}</p>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">{children}</div>
		</section>
	);
}
