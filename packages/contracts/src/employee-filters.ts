import { z } from "zod";
import { integerQuery, textQuery } from "./query";

const salaryQuery = integerQuery(0, Number.MAX_SAFE_INTEGER);
export const employeeFilterShape = {
	search: textQuery(200).optional(),
	countryCode: z
		.string()
		.regex(/^[A-Z]{2}$/)
		.optional(),
	departmentId: z.string().uuid().optional(),
	level: textQuery(100).pipe(z.string().min(1)).optional(),
	currencyCode: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional(),
	salaryMin: salaryQuery.optional(),
	salaryMax: salaryQuery.optional(),
};
export function validateSalaryRange(
	query: { salaryMin?: number; salaryMax?: number; currencyCode?: string },
	context: z.RefinementCtx,
) {
	if (
		(query.salaryMin !== undefined || query.salaryMax !== undefined) &&
		!query.currencyCode
	) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["currencyCode"],
			message: "Salary ranges require a currency",
		});
	}
	if (
		query.salaryMin !== undefined &&
		query.salaryMax !== undefined &&
		query.salaryMin > query.salaryMax
	) {
		context.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["salaryMax"],
			message: "Maximum salary must be at least the minimum",
		});
	}
}
export type EmployeeFilters = z.infer<typeof employeeFiltersSchema>;
const employeeFiltersSchema = z.object({
	...employeeFilterShape,
	status: z.enum(["all", "active", "inactive"]),
});
