import type {
	CreateEmployeeRequest,
	EmployeeDirectoryQuery,
	EmployeeDirectoryResponse,
	UpdateEmployeeRequest,
	UpdateEmployeeSalaryRequest,
} from "@salary-manager/contracts";
import {
	countries,
	currencies,
	type Database,
	departments,
	employees,
	jobTitles,
	salaryChanges,
} from "@salary-manager/domain";
import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	ilike,
	lte,
	or,
	sql,
} from "drizzle-orm";

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
		.select(employeeSelection)
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

const employeeSelection = {
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
};

export async function getEmployee(db: Pick<Database, "select">, id: string) {
	const [row] = await db
		.select({
			...employeeSelection,
			createdAt: employees.createdAt,
			updatedAt: employees.updatedAt,
		})
		.from(employees)
		.innerJoin(countries, eq(employees.countryCode, countries.code))
		.innerJoin(currencies, eq(employees.currencyCode, currencies.code))
		.innerJoin(departments, eq(employees.departmentId, departments.id))
		.innerJoin(jobTitles, eq(employees.jobTitleId, jobTitles.id))
		.where(eq(employees.id, id));
	return row
		? {
				...row,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			}
		: undefined;
}

export async function lockEmployee(db: Pick<Database, "select">, id: string) {
	const [row] = await db
		.select({
			version: employees.version,
			active: employees.active,
			salaryMinorUnits: employees.salaryMinorUnits,
			currencyCode: employees.currencyCode,
		})
		.from(employees)
		.where(eq(employees.id, id))
		.for("update");
	return row;
}

export async function insertEmployee(
	db: Pick<Database, "insert">,
	body: CreateEmployeeRequest,
) {
	const [row] = await db
		.insert(employees)
		.values(body)
		.onConflictDoNothing({ target: employees.code })
		.returning({ id: employees.id });
	return row?.id;
}

export async function updateEmployee(
	db: Pick<Database, "update">,
	id: string,
	body: UpdateEmployeeRequest,
) {
	const { version, ...profile } = body;
	await db
		.update(employees)
		.set({
			...profile,
			version: version + 1,
			updatedAt: sql`clock_timestamp()`,
		})
		.where(and(eq(employees.id, id), eq(employees.version, version)));
}

export async function deactivateEmployee(
	db: Pick<Database, "update">,
	id: string,
	version: number,
) {
	await db
		.update(employees)
		.set({
			active: false,
			version: version + 1,
			updatedAt: sql`clock_timestamp()`,
		})
		.where(and(eq(employees.id, id), eq(employees.version, version)));
}

export async function invalidEmployeeReferences(
	db: Pick<Database, "select">,
	body: CreateEmployeeRequest | UpdateEmployeeRequest,
) {
	// Key-share locks keep validated references present until the write commits.
	const [country] = await db
		.select({ code: countries.code })
		.from(countries)
		.where(eq(countries.code, body.countryCode))
		.for("key share");
	const [department] = await db
		.select({ id: departments.id })
		.from(departments)
		.where(eq(departments.id, body.departmentId))
		.for("key share");
	const [title] = await db
		.select({ id: jobTitles.id })
		.from(jobTitles)
		.where(eq(jobTitles.id, body.jobTitleId))
		.for("key share");
	const missing: string[] = [];
	if (!country) missing.push("countryCode");
	if (!department) missing.push("departmentId");
	if (!title) missing.push("jobTitleId");
	if ("currencyCode" in body) {
		const [currency] = await db
			.select({ code: currencies.code })
			.from(currencies)
			.where(eq(currencies.code, body.currencyCode))
			.for("key share");
		if (!currency) missing.push("currencyCode");
	}
	return missing;
}

export async function validSalaryCurrency(
	db: Pick<Database, "select">,
	currencyCode: string,
) {
	const [currency] = await db
		.select({ code: currencies.code })
		.from(currencies)
		.where(eq(currencies.code, currencyCode))
		.for("key share");
	return Boolean(currency);
}

export async function updateEmployeeSalary(
	db: Pick<Database, "update" | "insert">,
	id: string,
	body: UpdateEmployeeSalaryRequest,
	previous: { salaryMinorUnits: number; currencyCode: string },
) {
	const [saved] = await db
		.update(employees)
		.set({
			salaryMinorUnits: body.salaryMinorUnits,
			currencyCode: body.currencyCode,
			version: body.version + 1,
			updatedAt: sql`clock_timestamp()`,
		})
		.where(and(eq(employees.id, id), eq(employees.version, body.version)))
		.returning({ updatedAt: employees.updatedAt });
	if (!saved) throw new Error("Locked employee salary update failed");
	await db.insert(salaryChanges).values({
		employeeId: id,
		oldSalaryMinorUnits: previous.salaryMinorUnits,
		newSalaryMinorUnits: body.salaryMinorUnits,
		oldCurrencyCode: previous.currencyCode,
		newCurrencyCode: body.currencyCode,
		employeeVersion: body.version + 1,
		changedAt: saved.updatedAt,
		reason: body.reason,
	});
}
