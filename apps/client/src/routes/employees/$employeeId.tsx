import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BackLink } from "#/components/BackLink";
import { employeeQueries } from "#/features/employees/api";
import { EmployeeDetails } from "#/features/employees/details/EmployeeDetails";
import { referenceDataQuery } from "#/features/reference-data/api";

export const Route = createFileRoute("/employees/$employeeId")({
	loader: ({ context: { queryClient }, params }) =>
		Promise.all([
			queryClient.ensureQueryData(employeeQueries.detail(params.employeeId)),
			queryClient.ensureQueryData(referenceDataQuery),
		]),
	component: EmployeePage,
});

function EmployeePage() {
	const { employeeId } = Route.useParams();
	const { data: employee } = useSuspenseQuery(
		employeeQueries.detail(employeeId),
	);
	const { data: reference } = useSuspenseQuery(referenceDataQuery);
	return (
		<main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
			<BackLink to="/employees">All employees</BackLink>
			<EmployeeDetails employee={employee} reference={reference} />
		</main>
	);
}
