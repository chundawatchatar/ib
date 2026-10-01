import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BackLink } from "#/components/BackLink";
import { CreateEmployeeForm } from "#/features/employees/form/CreateEmployeeForm";
import { referenceDataQuery } from "#/features/reference-data/api";

export const Route = createFileRoute("/employees/new")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(referenceDataQuery),
	component: NewEmployeePage,
});

function NewEmployeePage() {
	const { data: reference } = useSuspenseQuery(referenceDataQuery);
	return (
		<main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
			<header className="flex flex-col gap-3">
				<BackLink to="/employees">All employees</BackLink>
				<div className="flex flex-col gap-1">
					<h1 className="m-0 text-xl font-semibold">New employee</h1>
					<p className="m-0 text-sm text-muted-foreground">
						Add someone to the directory with their starting salary.
					</p>
				</div>
			</header>
			<CreateEmployeeForm reference={reference} />
		</main>
	);
}
