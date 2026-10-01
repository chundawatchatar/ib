import { ROUTE } from "@salary-manager/common";
import { initContract } from "@ts-rest/core";
import { contractOptions } from "./contract-options";
import { apiErrorSchema } from "./errors";
import { payInsightsQuerySchema, payInsightsResponseSchema } from "./insights";

const c = initContract();
export const insightsContract = c.router(
	{
		getPayInsightsSummary: {
			method: "GET",
			path: ROUTE.PAY_INSIGHTS_SUMMARY,
			query: payInsightsQuerySchema,
			responses: { 200: payInsightsResponseSchema, 422: apiErrorSchema },
		},
	},
	contractOptions,
);
