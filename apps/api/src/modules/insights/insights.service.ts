import type {
	ApiError,
	PayInsightsQuery,
	PayInsightsResponse,
} from "@salary-manager/contracts";
import type { Database } from "@salary-manager/domain";
import * as queries from "./insights.queries";

type Result =
	| { kind: "success"; report: PayInsightsResponse }
	| { kind: "invalid"; error: ApiError };
export function createInsightsService(db: Database) {
	return {
		summary: (query: PayInsightsQuery): Promise<Result> =>
			db.transaction(
				async (tx) => {
					const rateDate =
						query.view === "usd" ? await queries.latestRateDate(tx) : null;
					if (query.view === "usd") {
						const missing = await queries.missingRates(tx, query, rateDate);
						if (missing.length)
							return {
								kind: "invalid",
								error: {
									message: `Missing USD exchange rates for ${missing.join(", ")} at ${rateDate ?? "an unavailable rate date"}`,
								},
							};
					}
					const summaries = await queries.summarize(tx, query, rateDate);
					return {
						kind: "success",
						report: {
							view: query.view,
							rateDate,
							headcount: summaries.reduce((sum, row) => sum + row.headcount, 0),
							summaries,
						},
					};
				},
				{ isolationLevel: "repeatable read", accessMode: "read only" },
			),
	};
}
export type InsightsService = ReturnType<typeof createInsightsService>;
