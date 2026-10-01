import type {
	EmployeeDirectoryQuery,
	EmployeeDirectoryResponse,
} from "@salary-manager/contracts";
import {
	countries,
	currencies,
	type Database,
	departments,
	employees,
	jobTitles,
} from "@salary-manager/domain";
import { and, asc, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

export async function listEmployees(
	db: Pick<Database, "select">,
	query: EmployeeDirectoryQuery,
): Promise<EmployeeDirectoryResponse> {
	// Escape LIKE metacharacters: search is a literal substring, not a pattern.
	const search = query.search?.replace(/[\\%_]/g, "\\$&");
	const where = and(
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
	const sortColumns = {
		name: employees.name,
		code: employees.code,
		country: countries.name,
		department: departments.name,
		level: employees.level,
		currency: employees.currencyCode,
		salary: employees.salaryMinorUnits,
	};
	const direction = query.sortDirection === "asc" ? asc : desc;
	// The service supplies a repeatable-read transaction for both reads.
	const [totals] = await db
		.select({ total: count() })
		.from(employees)
		.where(where);
	const items = await db
		.select({
			id: employees.id,
			code: employees.code,
			name: employees.name,
			countryCode: employees.countryCode,
			countryName: countries.name,
			currencyCode: employees.currencyCode,
			currencyMinorUnits: currencies.minorUnits,
			departmentId: employees.departmentId,
			departmentName: departments.name,
			level: employees.level,
			jobTitleId: employees.jobTitleId,
			jobTitleName: jobTitles.name,
			salaryMinorUnits: employees.salaryMinorUnits,
			active: employees.active,
			version: employees.version,
		})
		.from(employees)
		.innerJoin(countries, eq(employees.countryCode, countries.code))
		.innerJoin(currencies, eq(employees.currencyCode, currencies.code))
		.innerJoin(departments, eq(employees.departmentId, departments.id))
		.innerJoin(jobTitles, eq(employees.jobTitleId, jobTitles.id))
		.where(where)
		.orderBy(direction(sortColumns[query.sortBy]), asc(employees.id))
		.limit(query.pageSize)
		.offset((query.page - 1) * query.pageSize);
	return {
		items,
		total: totals?.total ?? 0,
		page: query.page,
		pageSize: query.pageSize,
	};
}
