import { z } from "zod";
import { integerQuery, paginationQuery, textQuery } from "./query.js";

const salaryQuery = integerQuery(0, Number.MAX_SAFE_INTEGER);

export const employeeDirectoryQuerySchema = z
	.object({
		...paginationQuery,
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
		status: z.enum(["all", "active", "inactive"]).default("all"),
		sortBy: z
			.enum([
				"name",
				"code",
				"country",
				"department",
				"level",
				"currency",
				"salary",
			])
			.default("name"),
		sortDirection: z.enum(["asc", "desc"]).default("asc"),
	})
	.strict()
	.superRefine((query, context) => {
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
	});

export const employeeDirectoryItemSchema = z.object({
	id: z.string().uuid(),
	code: z.string(),
	name: z.string(),
	countryCode: z.string(),
	countryName: z.string(),
	currencyCode: z.string(),
	currencyMinorUnits: z.number().int().min(0).max(6),
	departmentId: z.string().uuid(),
	departmentName: z.string(),
	level: z.string(),
	jobTitleId: z.string().uuid(),
	jobTitleName: z.string(),
	salaryMinorUnits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
	active: z.boolean(),
	version: z.number().int().positive(),
});

export const employeeDirectoryResponseSchema = z.object({
	items: z.array(employeeDirectoryItemSchema).max(100),
	page: z.number().int().positive(),
	pageSize: z.number().int().min(1).max(100),
	total: z.number().int().nonnegative(),
});
export type EmployeeDirectoryQuery = z.infer<
	typeof employeeDirectoryQuerySchema
>;
export type EmployeeDirectoryItem = z.infer<typeof employeeDirectoryItemSchema>;
export type EmployeeDirectoryResponse = z.infer<
	typeof employeeDirectoryResponseSchema
>;
