import { createFileRoute } from "@tanstack/react-router";
import { employeeQueries } from "#/features/employees/api";
import {
	directorySearchSchema,
	toDirectoryQuery,
} from "#/features/employees/directory-search";
import { EmployeeDirectory } from "#/features/employees/EmployeeDirectory";
import { referenceDataQuery } from "#/features/reference-data/api";

export const Route = createFileRoute("/employees/")({
	validateSearch: directorySearchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps }) => {
		const reference = await queryClient.ensureQueryData(referenceDataQuery);
		// Start the list request without blocking; the table shows its skeleton.
		void queryClient.prefetchQuery(
			employeeQueries.list(toDirectoryQuery(deps, reference.currencies)),
		);
	},
	component: Employees,
});

function Employees() {
	return (
		<main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
			<h1 className="m-0 text-2xl font-semibold">Employees</h1>
			<EmployeeDirectory />
		</main>
	);
}
