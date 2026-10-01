import type {
	EmployeeDirectoryQuery,
	EmployeeDirectoryResponse,
} from "@salary-manager/contracts";
import type { Database } from "@salary-manager/domain";
import { listEmployees } from "./employees.queries.js";

export function createEmployeeService(db: Database) {
	return {
		list: (query: EmployeeDirectoryQuery): Promise<EmployeeDirectoryResponse> =>
			db.transaction((tx) => listEmployees(tx, query), {
				isolationLevel: "repeatable read",
				accessMode: "read only",
			}),
	};
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
