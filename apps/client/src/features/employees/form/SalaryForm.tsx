import { zodResolver } from "@hookform/resolvers/zod";
import type {
	EmployeeResponse,
	ReferenceDataResponse,
} from "@salary-manager/contracts";
import {
	Alert,
	Button,
	FormField,
	Input,
	Select,
	Textarea,
} from "@salary-manager/ui";
import { useForm } from "react-hook-form";
import {
	controlProps,
	isConflict,
	saveErrorMessage,
	setServerFieldErrors,
} from "#/lib/form";
import { useUpdateSalary } from "../api";
import { ConflictAlert } from "./ConflictAlert";
import {
	type SalaryValues,
	salarySchema,
	toSalaryValues,
} from "./employee-form";
import { useLoadLatest } from "./use-load-latest";

type SalaryFormProps = {
	employee: EmployeeResponse;
	reference: ReferenceDataResponse;
};

const fields: (keyof SalaryValues)[] = ["currencyCode", "salary", "reason"];

// Like the profile form, it keeps the version it loaded; see EmployeeProfileForm.
export function SalaryForm({ employee, reference }: SalaryFormProps) {
	const updateSalary = useUpdateSalary(employee.id);
	const form = useForm({
		resolver: zodResolver(salarySchema(reference.currencies)),
		defaultValues: toSalaryValues(employee),
	});
	const {
		register,
		formState: { errors, isDirty },
	} = form;
	const latest = useLoadLatest(employee.id, (fresh) => {
		form.reset(toSalaryValues(fresh));
		updateSalary.reset();
	});

	const onSubmit = form.handleSubmit(async (body) => {
		try {
			form.reset(toSalaryValues(await updateSalary.mutateAsync(body)));
		} catch (error) {
			setServerFieldErrors(error, form.setError, (path) =>
				path === "salaryMinorUnits"
					? "salary"
					: fields.find((field) => field === path),
			);
		}
	});

	return (
		<form
			noValidate
			aria-label="Change salary"
			onSubmit={onSubmit}
			className="flex flex-col gap-4"
		>
			{isConflict(updateSalary.error) ? (
				<ConflictAlert onReload={latest.load} isReloading={latest.isLoading} />
			) : (
				updateSalary.isError && (
					<Alert variant="destructive">
						{saveErrorMessage(updateSalary.error)}
					</Alert>
				)
			)}
			<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
				<FormField
					id="salary-currency"
					label="Currency"
					error={errors.currencyCode?.message}
				>
					<Select
						{...controlProps("salary-currency", errors.currencyCode?.message)}
						{...register("currencyCode")}
					>
						{reference.currencies.map((currency) => (
							<option key={currency.code} value={currency.code}>
								{currency.code}
							</option>
						))}
					</Select>
				</FormField>
				<FormField
					id="salary-amount"
					label="New annual salary"
					error={errors.salary?.message}
				>
					<Input
						{...controlProps("salary-amount", errors.salary?.message)}
						inputMode="decimal"
						autoComplete="off"
						{...register("salary")}
					/>
				</FormField>
			</div>
			<FormField
				id="salary-reason"
				label="Reason (optional)"
				error={errors.reason?.message}
			>
				<Textarea
					{...controlProps("salary-reason", errors.reason?.message)}
					className="min-h-20"
					{...register("reason")}
				/>
			</FormField>
			<div className="flex items-center gap-3">
				<Button type="submit" disabled={updateSalary.isPending || !isDirty}>
					{updateSalary.isPending ? "Saving…" : "Save salary"}
				</Button>
				{updateSalary.isSuccess && !isDirty && (
					<p role="status" className="m-0 text-sm text-muted-foreground">
						Salary saved.
					</p>
				)}
			</div>
		</form>
	);
}
