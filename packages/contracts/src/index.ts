import { ROUTE } from "@salary-manager/common";
import { initContract } from "@ts-rest/core";
import { apiErrorSchema } from "./errors.js";
import { healthResponseSchema } from "./health.js";

export {
	type ApiError,
	type ApiErrorIssue,
	apiErrorIssueSchema,
	apiErrorSchema,
} from "./errors.js";
export { type HealthResponse, healthResponseSchema } from "./health.js";

const c = initContract();

export const contract = c.router(
	{
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
