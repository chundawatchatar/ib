import type { Database } from "@salary-manager/domain";
import { createEmployeeService } from "./modules/employees/employees.service";
import { createHealthService } from "./modules/health/health.service";
import { createInsightsService } from "./modules/insights/insights.service";

export function createServices(db: Database) {
	return {
		insights: createInsightsService(db),
		health: createHealthService(),
		employees: createEmployeeService(db),
	};
}

export type Services = ReturnType<typeof createServices>;
