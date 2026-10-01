import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
		<main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
			<Link to="/employees" className="self-start text-sm">
				All employees
			</Link>
			<h1 className="m-0 text-2xl font-semibold">New employee</h1>
			<CreateEmployeeForm reference={reference} />
		</main>
	);
}
