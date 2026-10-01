import { Button, Icon, Icons } from "@salary-manager/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
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
		<main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
			<div className="flex items-center justify-between gap-3">
				<h1 className="m-0 text-2xl font-semibold">Employees</h1>
				<Button asChild>
					<Link to="/employees/new" className="no-underline">
						<Icon icon={Icons.Plus} />
						New employee
					</Link>
				</Button>
			</div>
			<EmployeeDirectory />
		</main>
	);
}
