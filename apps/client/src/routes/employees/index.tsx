import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/employees/")({ component: Employees });

function Employees() {
	return (
		<main className="mx-auto max-w-7xl px-4 py-6">
			<h1 className="m-0 text-2xl font-semibold">Employees</h1>
		</main>
	);
}
