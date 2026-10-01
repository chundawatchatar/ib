import { contract } from "@salary-manager/contracts";
import { initServer } from "@ts-rest/express";
import {
	createEmployeeController,
	createEmployeeCreationController,
	createEmployeeDeactivationController,
	createEmployeeDetailsController,
	createEmployeeSalaryUpdateController,
	createEmployeeUpdateController,
} from "./modules/employees/employees.controller";
import { createHealthController } from "./modules/health/health.controller";
import {
	createInsightsController,
	createInsightsGroupsController,
	createInsightsHistogramController,
} from "./modules/insights/insights.controller";
import { createReferenceDataController } from "./modules/reference-data/reference-data.controller";
import type { Services } from "./services";

const server = initServer();

export function createRouter(services: Services) {
	return server.router(contract, {
		getPayInsightsSummary: createInsightsController(services.insights),
		getPayInsightsGroups: createInsightsGroupsController(services.insights),
		getPayInsightsHistogram: createInsightsHistogramController(
			services.insights,
		),
		listEmployees: createEmployeeController(services.employees),
		getEmployee: createEmployeeDetailsController(services.employees),
		createEmployee: createEmployeeCreationController(services.employees),
		updateEmployee: createEmployeeUpdateController(services.employees),
		updateEmployeeSalary: createEmployeeSalaryUpdateController(
			services.employees,
		),
		deactivateEmployee: createEmployeeDeactivationController(
			services.employees,
		),
		health: createHealthController(services.health),
		getReferenceData: createReferenceDataController(services.referenceData),
	});
}
