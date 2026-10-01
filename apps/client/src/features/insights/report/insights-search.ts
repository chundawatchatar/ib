import { z } from "zod";
import type { GroupsQuery, InsightsQuery } from "../api";

// Numeric-looking values arrive as numbers from the router; see directory-search.
const text = z
	.union([z.string(), z.number()])
	.transform(String)
	.pipe(z.string().trim().min(1))
	.optional()
	.catch(undefined);

export const groupByOptions = [
	{ value: "country", label: "Country" },
	{ value: "department", label: "Department" },
	{ value: "level", label: "Level" },
	{ value: "jobTitle", label: "Job title" },
] as const;

export const insightsSearchSchema = z.object({
	view: z.enum(["local", "usd"]).optional().catch(undefined),
	groupBy: z
		.enum(["country", "department", "level", "jobTitle"])
		.optional()
		.catch(undefined),
	countryCode: text,
	departmentId: text,
	level: text,
	/** Reports default to active employees, as the API does. */
	status: z.enum(["all", "inactive"]).optional().catch(undefined),
	/** Which currency's distribution the chart shows in the local view. */
	chartCurrency: text,
});
export type InsightsSearch = z.infer<typeof insightsSearchSchema>;

export const filterKeys = [
	"countryCode",
	"departmentId",
	"level",
	"status",
] as const satisfies (keyof InsightsSearch)[];

export const hasFilters = (search: InsightsSearch) =>
	filterKeys.some((key) => search[key] !== undefined);

export function toInsightsQuery(search: InsightsSearch): InsightsQuery {
	return {
		view: search.view ?? "local",
		status: search.status ?? "active",
		countryCode: search.countryCode,
		departmentId: search.departmentId,
		level: search.level,
	};
}

export function toGroupsQuery(search: InsightsSearch): GroupsQuery {
	return { ...toInsightsQuery(search), groupBy: search.groupBy ?? "country" };
}
