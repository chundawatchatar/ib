import type {
	EmployeeDirectoryItem,
	EmployeeResponse,
	ReferenceDataResponse,
} from "@salary-manager/contracts";

export const ENGINEERING = "00000000-0000-4000-8000-0000000000d1";
export const FINANCE = "00000000-0000-4000-8000-0000000000d2";
export const ENGINEER = "00000000-0000-4000-8000-0000000000a1";
export const ANALYST = "00000000-0000-4000-8000-0000000000a2";

export const referenceData: ReferenceDataResponse = {
	countries: [
		{ code: "DE", name: "Germany", defaultCurrencyCode: "EUR" },
		{ code: "JP", name: "Japan", defaultCurrencyCode: "JPY" },
		{ code: "US", name: "United States", defaultCurrencyCode: "USD" },
	],
	currencies: [
		{ code: "EUR", name: "Euro", minorUnits: 2 },
		{ code: "JPY", name: "Japanese yen", minorUnits: 0 },
		{ code: "USD", name: "US dollar", minorUnits: 2 },
	],
	departments: [
		{ id: ENGINEERING, name: "Engineering" },
		{ id: FINANCE, name: "Finance" },
	],
	jobTitles: [
		{ id: ANALYST, name: "Analyst" },
		{ id: ENGINEER, name: "Engineer" },
	],
	levels: ["L1", "L2", "L10"],
};

export function employee(
	overrides: Partial<EmployeeResponse> = {},
): EmployeeResponse {
	return {
		id: "00000000-0000-4000-8000-000000000001",
		code: "EMP00001",
		name: "Ada Lovelace",
		countryCode: "US",
		countryName: "United States",
		currencyCode: "USD",
		currencyMinorUnits: 2,
		departmentId: ENGINEERING,
		departmentName: "Engineering",
		level: "L2",
		jobTitleId: ENGINEER,
		jobTitleName: "Engineer",
		salaryMinorUnits: 15_000_000,
		active: true,
		version: 1,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

export function directoryPage(
	items: EmployeeDirectoryItem[],
	{ page = 1, total = items.length } = {},
) {
	return { items, page, pageSize: 25, total };
}
