import { parseMajorUnits } from "@salary-manager/common";
import type { ReferenceDataResponse } from "@salary-manager/contracts";
import { z } from "zod";
import type { DirectoryQuery } from "./api";

// The router parses numeric-looking values ("123", "50000") as numbers, so
// text parameters accept both. Invalid values are dropped instead of failing.
const text = z
	.union([z.string(), z.number()])
	.transform(String)
	.pipe(z.string().trim().min(1))
	.optional()
	.catch(undefined);

export const sortFields = [
	"name",
	"code",
	"country",
	"department",
	"level",
	"salary",
] as const;
export type SortField = (typeof sortFields)[number];

export const directorySearchSchema = z.object({
	page: z.number().int().min(1).optional().catch(undefined),
	search: text,
	countryCode: text,
	departmentId: text,
	level: text,
	currencyCode: text,
	status: z.enum(["active", "inactive"]).optional().catch(undefined),
	/** Major units as typed, such as "85000.50"; converted with the currency's precision. */
	salaryMin: text,
	salaryMax: text,
	sortBy: z.enum(sortFields).optional().catch(undefined),
	sortDirection: z.enum(["asc", "desc"]).optional().catch(undefined),
});
export type DirectorySearch = z.infer<typeof directorySearchSchema>;

export const PAGE_SIZE = 25;

export const filterKeys = [
	"search",
	"countryCode",
	"departmentId",
	"level",
	"currencyCode",
	"status",
	"salaryMin",
	"salaryMax",
] as const satisfies (keyof DirectorySearch)[];

export function hasFilters(search: DirectorySearch): boolean {
	return filterKeys.some((key) => search[key] !== undefined);
}

/** Salary bound in minor units, or undefined when absent or not a valid amount. */
export function salaryBound(
	value: string | undefined,
	currencyCode: string | undefined,
	currencies: ReferenceDataResponse["currencies"],
): number | undefined {
	const currency = currencies.find((item) => item.code === currencyCode);
	if (value === undefined || !currency) return undefined;
	return parseMajorUnits(value, currency.minorUnits);
}

export function toDirectoryQuery(
	search: DirectorySearch,
	currencies: ReferenceDataResponse["currencies"],
): DirectoryQuery {
	const salaryMin = salaryBound(
		search.salaryMin,
		search.currencyCode,
		currencies,
	);
	const salaryMax = salaryBound(
		search.salaryMax,
		search.currencyCode,
		currencies,
	);
	// Undefined keys are skipped in the URL and in query-key hashing.
	return {
		page: String(search.page ?? 1),
		pageSize: String(PAGE_SIZE),
		status: search.status ?? "all",
		sortBy: search.sortBy ?? "name",
		sortDirection: search.sortDirection ?? "asc",
		search: search.search,
		countryCode: search.countryCode,
		departmentId: search.departmentId,
		level: search.level,
		currencyCode: search.currencyCode,
		salaryMin: salaryMin === undefined ? undefined : String(salaryMin),
		salaryMax: salaryMax === undefined ? undefined : String(salaryMax),
	};
}
