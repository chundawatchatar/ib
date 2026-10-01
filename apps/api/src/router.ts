import { contract } from "@salary-manager/contracts";
import { initServer } from "@ts-rest/express";
import { createEmployeeController } from "./modules/employees/employees.controller.js";
import { createHealthController } from "./modules/health/health.controller.js";
import type { Services } from "./services.js";

const server = initServer();

export function createRouter(services: Services) {
	return server.router(contract, {
		listEmployees: createEmployeeController(services.employees),
		health: createHealthController(services.health),
	});
}
