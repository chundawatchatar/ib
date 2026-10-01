import { insightsContract } from "./insights.contract";

export type { EmployeeFilters } from "./employee-filters";
export * from "./insights";
export { insightsContract } from "./insights.contract";

import { initContract } from "@ts-rest/core";
import { employeeContract } from "./employees.contract";
import { healthContract } from "./health.contract";
import { referenceDataContract } from "./reference-data.contract";

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
export * from "./reference-data";
export { referenceDataContract } from "./reference-data.contract";

const c = initContract();

export const contract = c.router({
	...employeeContract,
	...healthContract,
	...insightsContract,
	...referenceDataContract,
});
