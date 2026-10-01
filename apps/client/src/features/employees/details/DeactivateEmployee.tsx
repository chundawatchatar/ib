import type { EmployeeResponse } from "@salary-manager/contracts";
import { Alert, Button } from "@salary-manager/ui";
import { useState } from "react";
import { isConflict, saveErrorMessage } from "#/lib/form";
import { useDeactivateEmployee } from "../api";

export function DeactivateEmployee({
	employee,
}: {
	employee: EmployeeResponse;
}) {
	const deactivate = useDeactivateEmployee(employee.id);
	const [confirming, setConfirming] = useState(false);

	if (!employee.active)
		return (
			<p className="m-0 text-sm text-muted-foreground">
				This employee is inactive. They stay in the directory and are left out
				of pay reports by default.
			</p>
		);

	return (
		<div className="flex flex-col gap-3">
			{deactivate.isError && (
				<Alert variant="destructive">
					{isConflict(deactivate.error)
						? "This employee changed since you opened the page. Review the latest details, then try again."
						: saveErrorMessage(deactivate.error)}
				</Alert>
			)}
			{confirming ? (
				<div className="flex flex-wrap items-center gap-3">
					<p className="m-0 text-sm">
						Deactivate {employee.name}? They stay in the directory and are left
						out of pay reports by default.
					</p>
					<Button
						variant="destructive"
						disabled={deactivate.isPending}
						onClick={() =>
							deactivate.mutate(
								{ version: employee.version },
								{ onSettled: () => setConfirming(false) },
							)
						}
					>
						{deactivate.isPending ? "Deactivating…" : "Deactivate"}
					</Button>
					<Button variant="ghost" onClick={() => setConfirming(false)}>
						Keep active
					</Button>
				</div>
			) : (
				<Button
					variant="secondary"
					className="self-start"
					onClick={() => {
						deactivate.reset();
						setConfirming(true);
					}}
				>
					Deactivate employee
				</Button>
			)}
		</div>
	);
}
