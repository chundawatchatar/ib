import { z } from "zod";
import { integerQuery, paginationQuery, textQuery } from "./query";

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

const requiredText = (maximum: number) =>
	textQuery(maximum).pipe(z.string().min(1));
const employeeProfileShape = {
	code: requiredText(100),
	name: requiredText(200),
	countryCode: z.string().regex(/^[A-Z]{2}$/),
	departmentId: z.string().uuid(),
	level: requiredText(100),
	jobTitleId: z.string().uuid(),
};
// PostgreSQL versions are int4; reserve room for the next version.
const expectedVersionSchema = z
	.number()
	.int()
	.min(1)
	.max(2_147_483_646)
	.describe(
		"The version the client last read; a mismatch returns 409 and the client must reload.",
	);

export const employeeParamsSchema = z
	.object({ id: z.string().uuid() })
	.strict();
export const createEmployeeRequestSchema = z
	.object({
		...employeeProfileShape,
		currencyCode: z.string().regex(/^[A-Z]{3}$/),
		salaryMinorUnits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
	})
	.strict();
export const updateEmployeeRequestSchema = z
	.object({
		...employeeProfileShape,
		version: expectedVersionSchema,
	})
	.strict();
export const deactivateEmployeeRequestSchema = z
	.object({ version: expectedVersionSchema })
	.strict()
	.describe(
		"Repeating with the current version of an inactive employee is a no-op.",
	);
export const employeeResponseSchema = employeeDirectoryItemSchema.extend({
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type EmployeeParams = z.infer<typeof employeeParamsSchema>;
export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;
export type UpdateEmployeeRequest = z.infer<typeof updateEmployeeRequestSchema>;
export type DeactivateEmployeeRequest = z.infer<
	typeof deactivateEmployeeRequestSchema
>;
export type EmployeeResponse = z.infer<typeof employeeResponseSchema>;

export const updateEmployeeSalaryRequestSchema = z
	.object({
		version: expectedVersionSchema,
		currencyCode: z.string().regex(/^[A-Z]{3}$/),
		salaryMinorUnits: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
		reason: requiredText(1000).optional(),
	})
	.strict()
	.describe(
		"Updates salary and currency and writes a salary_changes audit row in the same transaction.",
	);
export type UpdateEmployeeSalaryRequest = z.infer<
	typeof updateEmployeeSalaryRequestSchema
>;
