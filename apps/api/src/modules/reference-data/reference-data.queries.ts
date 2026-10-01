import type { ReferenceDataResponse } from "@salary-manager/contracts";
import {
	countries,
	currencies,
	type Database,
	departments,
	employees,
	jobTitles,
} from "@salary-manager/domain";
import { asc } from "drizzle-orm";

type Reader = Pick<Database, "select" | "selectDistinct">;

// Levels come back unordered; the service applies natural numeric order.
export async function readReferenceData(
	db: Reader,
): Promise<ReferenceDataResponse> {
	const countryRows = await db
		.select({
			code: countries.code,
			name: countries.name,
			defaultCurrencyCode: countries.defaultCurrencyCode,
		})
		.from(countries)
		.orderBy(asc(countries.name));
	const currencyRows = await db
		.select({
			code: currencies.code,
			name: currencies.name,
			minorUnits: currencies.minorUnits,
		})
		.from(currencies)
		.orderBy(asc(currencies.code));
	const departmentRows = await db
		.select({ id: departments.id, name: departments.name })
		.from(departments)
		.orderBy(asc(departments.name));
	const jobTitleRows = await db
		.select({ id: jobTitles.id, name: jobTitles.name })
		.from(jobTitles)
		.orderBy(asc(jobTitles.name));
	const levelRows = await db
		.selectDistinct({ level: employees.level })
		.from(employees);
	return {
		countries: countryRows,
		currencies: currencyRows,
		departments: departmentRows,
		jobTitles: jobTitleRows,
		levels: levelRows.map((row) => row.level),
	};
}
