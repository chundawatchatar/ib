import type { EmployeeResponse } from "@salary-manager/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { employeeQueries } from "../api";

/** Fetches the employee fresh after a 409 and hands it to the form to reset. */
export function useLoadLatest(
	employeeId: string,
	onLoaded: (latest: EmployeeResponse) => void,
) {
	const queryClient = useQueryClient();
	const [isLoading, setLoading] = useState(false);
	const load = async () => {
		setLoading(true);
		try {
			onLoaded(
				await queryClient.fetchQuery({
					...employeeQueries.detail(employeeId),
					staleTime: 0,
				}),
			);
		} finally {
			setLoading(false);
		}
	};
	return { load, isLoading };
}
