import { zodResolver } from "@hookform/resolvers/zod";
import type {
	EmployeeResponse,
	ReferenceDataResponse,
} from "@salary-manager/contracts";
import { Alert, Button } from "@salary-manager/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { isConflict, saveErrorMessage, setServerFieldErrors } from "#/lib/form";
import { employeeQueries, useUpdateEmployee } from "../api";
import { ConflictAlert } from "./ConflictAlert";
import {
	type ProfileField,
	profileSchema,
	toProfileValues,
} from "./employee-form";
import { ProfileFields } from "./ProfileFields";

type EmployeeProfileFormProps = {
	employee: EmployeeResponse;
	reference: ReferenceDataResponse;
};

// The form keeps the version it was loaded with, so a background refetch never
// turns a stale edit into a silent overwrite; a 409 asks to reload instead.
export function EmployeeProfileForm({
	employee,
	reference,
}: EmployeeProfileFormProps) {
	const queryClient = useQueryClient();
	const updateEmployee = useUpdateEmployee(employee.id);
	const [reloading, setReloading] = useState(false);
	const form = useForm({
		resolver: zodResolver(profileSchema),
		defaultValues: toProfileValues(employee),
	});
	const fields = Object.keys(form.getValues()) as ProfileField[];

	const onSubmit = form.handleSubmit(async (body) => {
		try {
			const saved = await updateEmployee.mutateAsync(body);
			form.reset(toProfileValues(saved));
		} catch (error) {
			setServerFieldErrors(error, form.setError, (path) =>
				fields.find((field) => field === path),
			);
		}
	});

	const loadLatest = async () => {
		setReloading(true);
		try {
			const latest = await queryClient.fetchQuery({
				...employeeQueries.detail(employee.id),
				staleTime: 0,
			});
			form.reset(toProfileValues(latest));
			updateEmployee.reset();
		} finally {
			setReloading(false);
		}
	};

	return (
		<FormProvider {...form}>
			<form
				noValidate
				aria-label="Profile"
				onSubmit={onSubmit}
				className="flex flex-col gap-4"
			>
				{isConflict(updateEmployee.error) ? (
					<ConflictAlert onReload={loadLatest} isReloading={reloading} />
				) : (
					updateEmployee.isError && (
						<Alert variant="destructive">
							{saveErrorMessage(updateEmployee.error)}
						</Alert>
					)
				)}
				<div className="grid gap-4 sm:grid-cols-2">
					<ProfileFields reference={reference} />
				</div>
				<div className="flex items-center gap-3">
					<Button
						type="submit"
						disabled={updateEmployee.isPending || !form.formState.isDirty}
					>
						{updateEmployee.isPending ? "Saving…" : "Save changes"}
					</Button>
					{updateEmployee.isSuccess && !form.formState.isDirty && (
						<p role="status" className="m-0 text-sm text-muted-foreground">
							Changes saved.
						</p>
					)}
				</div>
			</form>
		</FormProvider>
	);
}
