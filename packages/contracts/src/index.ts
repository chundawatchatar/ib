import { initContract } from "@ts-rest/core";
import { employeeContract } from "./employees.contract";
import { healthContract } from "./health.contract";

export * from "./employees";
export { employeeContract } from "./employees.contract";
export {
	type ApiError,
	type ApiErrorIssue,
	apiErrorIssueSchema,
	apiErrorSchema,
} from "./errors";
export { type HealthResponse, healthResponseSchema } from "./health";
export { healthContract } from "./health.contract";
export { integerQuery, paginationQuery, textQuery } from "./query";

const c = initContract();

export const contract = c.router({ ...employeeContract, ...healthContract });
