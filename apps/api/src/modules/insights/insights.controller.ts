import type { contract } from "@salary-manager/contracts";
import type { AppRouteImplementation } from "@ts-rest/express";
import type { InsightsService } from "./insights.service";
export function createInsightsController(
	service: InsightsService,
): AppRouteImplementation<typeof contract.getPayInsightsSummary> {
	return async ({ query }) => {
		const result = await service.summary(query);
		return result.kind === "success"
			? { status: 200, body: result.report }
			: { status: 422, body: result.error };
	};
}
