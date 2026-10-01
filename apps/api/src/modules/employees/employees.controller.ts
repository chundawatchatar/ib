import type { contract } from "@salary-manager/contracts";
import type { AppRouteImplementation } from "@ts-rest/express";
import type { EmployeeService } from "./employees.service.js";

export function createEmployeeController(
	service: EmployeeService,
): AppRouteImplementation<typeof contract.listEmployees> {
	return async ({ query }) => ({
		status: 200,
		body: await service.list(query),
	});
}
