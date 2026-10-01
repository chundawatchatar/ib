import { ROUTE } from "@salary-manager/common";
import { initContract } from "@ts-rest/core";
import { contractOptions } from "./contract-options";
import { apiErrorSchema } from "./errors";
import {
	payInsightsGroupsQuerySchema,
	payInsightsGroupsResponseSchema,
	payInsightsHistogramResponseSchema,
	payInsightsQuerySchema,
	payInsightsResponseSchema,
} from "./insights";

const c = initContract();
export const insightsContract = c.router(
	{
		getPayInsightsGroups: {
			method: "GET",
			path: ROUTE.PAY_INSIGHTS_GROUPS,
			query: payInsightsGroupsQuerySchema,
			responses: { 200: payInsightsGroupsResponseSchema, 422: apiErrorSchema },
		},
		getPayInsightsHistogram: {
			method: "GET",
			path: ROUTE.PAY_INSIGHTS_HISTOGRAM,
			query: payInsightsQuerySchema,
			responses: {
				200: payInsightsHistogramResponseSchema,
				422: apiErrorSchema,
			},
		},
		getPayInsightsSummary: {
			method: "GET",
			path: ROUTE.PAY_INSIGHTS_SUMMARY,
			query: payInsightsQuerySchema,
			responses: { 200: payInsightsResponseSchema, 422: apiErrorSchema },
		},
	},
	contractOptions,
);
