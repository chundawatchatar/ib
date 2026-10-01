import { contract } from "@salary-manager/contracts";
import { initServer } from "@ts-rest/express";
import {
	createEmployeeController,
	createEmployeeCreationController,
	createEmployeeDeactivationController,
	createEmployeeDetailsController,
	createEmployeeUpdateController,
} from "./modules/employees/employees.controller";
import { createHealthController } from "./modules/health/health.controller";
import type { Services } from "./services";

const server = initServer();

export function createRouter(services: Services) {
	return server.router(contract, {
		listEmployees: createEmployeeController(services.employees),
		getEmployee: createEmployeeDetailsController(services.employees),
		createEmployee: createEmployeeCreationController(services.employees),
		updateEmployee: createEmployeeUpdateController(services.employees),
		deactivateEmployee: createEmployeeDeactivationController(
			services.employees,
		),
		health: createHealthController(services.health),
	});
}
