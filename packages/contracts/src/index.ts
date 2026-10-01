import { ROUTE } from "@salary-manager/common";
import { initContract } from "@ts-rest/core";
import {
	employeeDirectoryQuerySchema,
	employeeDirectoryResponseSchema,
} from "./employees.js";
import { apiErrorSchema } from "./errors.js";
import { healthResponseSchema } from "./health.js";

export * from "./employees.js";
export {
	type ApiError,
	type ApiErrorIssue,
	apiErrorIssueSchema,
	apiErrorSchema,
} from "./errors.js";
export { type HealthResponse, healthResponseSchema } from "./health.js";
export { integerQuery, paginationQuery, textQuery } from "./query.js";

const c = initContract();

export const contract = c.router(
	{
		listEmployees: {
			method: "GET",
			path: ROUTE.EMPLOYEES,
			query: employeeDirectoryQuerySchema,
			responses: { 200: employeeDirectoryResponseSchema },
		},
		health: {
			method: "GET",
			path: ROUTE.HEALTH,
			responses: { 200: healthResponseSchema },
		},
	},
	{
		commonResponses: {
			400: apiErrorSchema,
			413: apiErrorSchema,
			415: apiErrorSchema,
			500: apiErrorSchema,
		},
	},
);
