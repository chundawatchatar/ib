import type { Database } from "@salary-manager/domain";
import { createEmployeeService } from "./modules/employees/employees.service.js";
import { createHealthService } from "./modules/health/health.service.js";

export function createServices(db: Database) {
	return {
		health: createHealthService(),
		employees: createEmployeeService(db),
	};
}

export type Services = ReturnType<typeof createServices>;
