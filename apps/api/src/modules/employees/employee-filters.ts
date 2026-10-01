import type { EmployeeFilters } from "@salary-manager/contracts";
import { employees } from "@salary-manager/domain";
import { and, eq, gte, ilike, lte, or } from "drizzle-orm";
export function employeeWhere(query: EmployeeFilters) {
	// Escape LIKE metacharacters: search is a literal substring, not a pattern.
	const search = query.search?.replace(/[\\%_]/g, "\\$&");
	return and(
		search
			? or(
					ilike(employees.name, `%${search}%`),
					ilike(employees.code, `%${search}%`),
				)
			: undefined,
		query.countryCode
			? eq(employees.countryCode, query.countryCode)
			: undefined,
		query.departmentId
			? eq(employees.departmentId, query.departmentId)
			: undefined,
		query.level ? eq(employees.level, query.level) : undefined,
		query.currencyCode
			? eq(employees.currencyCode, query.currencyCode)
			: undefined,
		query.salaryMin !== undefined
			? gte(employees.salaryMinorUnits, query.salaryMin)
			: undefined,
		query.salaryMax !== undefined
			? lte(employees.salaryMinorUnits, query.salaryMax)
			: undefined,
		query.status !== "all"
			? eq(employees.active, query.status === "active")
			: undefined,
	);
}
