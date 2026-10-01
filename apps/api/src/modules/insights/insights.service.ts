import type {
	ApiError,
	PayInsightsGroupsQuery,
	PayInsightsGroupsResponse,
	PayInsightsHistogramResponse,
	PayInsightsQuery,
	PayInsightsResponse,
} from "@salary-manager/contracts";
import type { Database } from "@salary-manager/domain";
import * as queries from "./insights.queries";

type Result<T> =
	| { kind: "success"; report: T }
	| { kind: "invalid"; error: ApiError };
type Reader = Parameters<typeof queries.summarize>[0];
export function createInsightsService(db: Database) {
	const report = <T>(
		query: PayInsightsQuery,
		read: (tx: Reader, date: string | null) => Promise<Result<T>>,
	): Promise<Result<T>> =>
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
				return read(tx, rateDate);
			},
			{ isolationLevel: "repeatable read", accessMode: "read only" },
		);
	return {
		summary: (query: PayInsightsQuery): Promise<Result<PayInsightsResponse>> =>
			report(query, async (tx, rateDate) => {
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
			}),
		groups: (
			query: PayInsightsGroupsQuery,
		): Promise<Result<PayInsightsGroupsResponse>> =>
			report(query, async (tx, rateDate) => {
				if (await queries.exceedsGroupLimit(tx, query, query.groupBy))
					return {
						kind: "invalid",
						error: {
							message: "Report exceeds the limit of 1,000,000 populated groups",
						},
					};
				const groups = await queries.groupSummaries(
					tx,
					query,
					rateDate,
					query.groupBy,
				);
				return {
					kind: "success",
					report: {
						view: query.view,
						rateDate,
						groupBy: query.groupBy,
						headcount: groups.reduce((sum, row) => sum + row.headcount, 0),
						groups,
					},
				};
			}),
		histogram: (
			query: PayInsightsQuery,
		): Promise<Result<PayInsightsHistogramResponse>> =>
			report(query, async (tx, rateDate) => {
				const distributions = await queries.histogram(tx, query, rateDate);
				return {
					kind: "success",
					report: {
						view: query.view,
						rateDate,
						headcount: distributions.reduce(
							(sum, row) => sum + row.headcount,
							0,
						),
						distributions,
					},
				};
			}),
	};
}
export type InsightsService = ReturnType<typeof createInsightsService>;
