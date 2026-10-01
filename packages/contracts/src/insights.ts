import { z } from "zod";
import { employeeFilterShape, validateSalaryRange } from "./employee-filters";

const payInsightsQueryShape = {
	...employeeFilterShape,
	status: z.enum(["all", "active", "inactive"]).default("active"),
	view: z.enum(["local", "usd"]).default("local"),
};
export const payInsightsQuerySchema = z
	.object(payInsightsQueryShape)
	.strict()
	.superRefine(validateSalaryRange);
const money = z
	.string()
	.regex(/^\d+$/)
	.describe(
		"Integer minor units as a decimal string; exact numeric calculations rounded once, half up, to the final currency precision.",
	);
export const paySummarySchema = z
	.object({
		currencyCode: z.string().regex(/^[A-Z]{3}$/),
		currencyMinorUnits: z.number().int().min(0).max(6),
		headcount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
		total: money,
		average: money.nullable(),
		median: money.nullable(),
		min: money.nullable(),
		max: money.nullable(),
		p25: money.nullable(),
		p75: money.nullable(),
	})
	.describe(
		"Median and quartiles interpolate numeric neighbors at rank 1 + (n-1)*p. Converted salaries are not individually rounded.",
	);
export const payInsightsResponseSchema = z
	.object({
		view: z.enum(["local", "usd"]),
		headcount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
		rateDate: z
			.string()
			.date()
			.nullable()
			.describe(
				"Latest installed USD rate date in USD mode; null in local mode or when no USD rate set exists for an empty population.",
			),
		summaries: z.array(paySummarySchema).max(250),
	})
	.describe(
		"Local mode reports populated currencies separately, or an empty list. USD mode always returns one USD summary; for no matches total and headcount are zero and the other statistics are null.",
	);
export type PayInsightsQuery = z.infer<typeof payInsightsQuerySchema>;
export type PayInsightsResponse = z.infer<typeof payInsightsResponseSchema>;

export const MAX_INSIGHT_GROUPS = 1_000_000;
export const payInsightsGroupBySchema = z.enum([
	"country",
	"department",
	"level",
	"jobTitle",
]);
export const payInsightsGroupsQuerySchema = z
	.object({
		...payInsightsQueryShape,
		groupBy: payInsightsGroupBySchema,
	})
	.strict()
	.superRefine(validateSalaryRange);
export const payInsightsGroupSchema = z.object({
	key: z.string().min(1),
	label: z.string().min(1),
	headcount: paySummarySchema.shape.headcount,
	summaries: z.array(paySummarySchema).max(250),
});
const reportMetadata = payInsightsResponseSchema.pick({
	view: true,
	headcount: true,
	rateDate: true,
});
export const payInsightsGroupsResponseSchema = reportMetadata
	.extend({
		groupBy: payInsightsGroupBySchema,
		groups: z.array(payInsightsGroupSchema).max(MAX_INSIGHT_GROUPS),
	})
	.describe(
		"Only populated groups. Keys are country codes, department/title IDs, or level text. Local summaries separate currencies. Groups sort by label then key; levels use English natural numeric order. More than 1,000,000 groups returns 422 without truncation.",
	);
const boundary = z
	.string()
	.regex(/^\d+(?:\.\d+)?$/)
	.describe(
		"Exact nonnegative decimal minor units; boundaries may be fractional and are never rounded.",
	);
export const payHistogramBucketSchema = z
	.object({
		lowerBound: boundary,
		upperBound: boundary,
		upperInclusive: z.boolean(),
		headcount: paySummarySchema.shape.headcount,
	})
	.describe(
		"Lower bound inclusive; upper bound exclusive except the last bucket. Identical salaries produce one inclusive bucket with equal bounds.",
	);
export const payDistributionSchema = z
	.object({
		currencyCode: paySummarySchema.shape.currencyCode,
		currencyMinorUnits: paySummarySchema.shape.currencyMinorUnits,
		headcount: paySummarySchema.shape.headcount,
		buckets: z.array(payHistogramBucketSchema).max(11),
	})
	.describe(
		"For nonconstant salaries, choose the smallest 1, 2, or 5 × 10^n major-unit width at least (max-min)/10, including negative exponents. Align edges outward to width multiples; at most 11 buckets, including zero-count buckets. Counts use unrounded salaries.",
	);
export const payInsightsHistogramResponseSchema = reportMetadata
	.extend({
		distributions: z.array(payDistributionSchema).max(250),
	})
	.describe(
		"Whole filtered population, currencies ordered by code. Empty local results have no distributions; empty USD results have one zero-headcount USD distribution with no buckets.",
	);
export type PayInsightsGroupsQuery = z.infer<
	typeof payInsightsGroupsQuerySchema
>;
export type PayInsightsGroupBy = z.infer<typeof payInsightsGroupBySchema>;
export type PayInsightsGroupsResponse = z.infer<
	typeof payInsightsGroupsResponseSchema
>;
export type PayInsightsHistogramResponse = z.infer<
	typeof payInsightsHistogramResponseSchema
>;
