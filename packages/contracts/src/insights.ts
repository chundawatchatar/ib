import { z } from "zod";
import { employeeFilterShape, validateSalaryRange } from "./employee-filters";
export const payInsightsQuerySchema = z
	.object({
		...employeeFilterShape,
		status: z.enum(["all", "active", "inactive"]).default("active"),
		view: z.enum(["local", "usd"]).default("local"),
	})
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
