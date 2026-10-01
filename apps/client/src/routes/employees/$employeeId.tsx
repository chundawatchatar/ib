import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
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
			<Link to="/employees" className="self-start text-sm">
				All employees
			</Link>
			<EmployeeDetails employee={employee} reference={reference} />
		</main>
	);
}
