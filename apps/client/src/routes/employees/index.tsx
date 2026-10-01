import { createFileRoute } from "@tanstack/react-router";
import { employeeQueries } from "#/features/employees/api";
import {
	directorySearchSchema,
	toDirectoryQuery,
} from "#/features/employees/directory/directory-search";
import { EmployeeDirectory } from "#/features/employees/directory/EmployeeDirectory";
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
		<main className="mx-auto max-w-7xl px-4 py-6">
			<EmployeeDirectory />
		</main>
	);
}
