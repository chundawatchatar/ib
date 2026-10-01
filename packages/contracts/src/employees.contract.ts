import { ROUTE } from "@salary-manager/common";
import { initContract } from "@ts-rest/core";
import { contractOptions } from "./contract-options";
import {
	createEmployeeRequestSchema,
	deactivateEmployeeRequestSchema,
	employeeDirectoryQuerySchema,
	employeeDirectoryResponseSchema,
	employeeParamsSchema,
	employeeResponseSchema,
	updateEmployeeRequestSchema,
} from "./employees";
import { apiErrorSchema } from "./errors";

const c = initContract();

export const employeeContract = c.router(
	{
		listEmployees: {
			method: "GET",
			path: ROUTE.EMPLOYEES,
			query: employeeDirectoryQuerySchema,
			responses: { 200: employeeDirectoryResponseSchema },
		},
		createEmployee: {
			method: "POST",
			path: ROUTE.EMPLOYEES,
			body: createEmployeeRequestSchema,
			responses: { 201: employeeResponseSchema, 409: apiErrorSchema },
		},
		getEmployee: {
			method: "GET",
			path: ROUTE.EMPLOYEE,
			pathParams: employeeParamsSchema,
			responses: { 200: employeeResponseSchema, 404: apiErrorSchema },
		},
		updateEmployee: {
			method: "PUT",
			path: ROUTE.EMPLOYEE,
			pathParams: employeeParamsSchema,
			body: updateEmployeeRequestSchema,
			responses: {
				200: employeeResponseSchema,
				404: apiErrorSchema,
				409: apiErrorSchema,
			},
		},
		deactivateEmployee: {
			method: "POST",
			path: ROUTE.DEACTIVATE_EMPLOYEE,
			pathParams: employeeParamsSchema,
			body: deactivateEmployeeRequestSchema,
			responses: {
				200: employeeResponseSchema,
				404: apiErrorSchema,
				409: apiErrorSchema,
			},
		},
	},
	contractOptions,
);
