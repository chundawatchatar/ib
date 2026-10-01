import { minorToMajorText, parseMajorUnits } from "@salary-manager/common";
import {
	createEmployeeRequestSchema,
	type EmployeeResponse,
	type ReferenceDataResponse,
	updateEmployeeRequestSchema,
	updateEmployeeSalaryRequestSchema,
} from "@salary-manager/contracts";
import { z } from "zod";

// Forms reuse the contract's request schemas. The only form-specific part is
// salary: people type major units ("85000.50"), which are converted to the
// contract's integer minor units with the chosen currency's precision.

type Currencies = ReferenceDataResponse["currencies"];

// Checked per field so a malformed amount is flagged with the other fields;
// precision depends on the currency and is checked once the object is valid.
const salaryText = z
	.string()
	.trim()
	.min(1)
	.regex(/^\d+(\.\d+)?$/, "Enter an amount without commas, such as 85000.50");

function withMajorSalary<T extends { currencyCode: string; salary: string }>(
	currencies: Currencies,
) {
	return (values: T, context: z.RefinementCtx) => {
		const { salary, ...rest } = values;
		const currency = currencies.find(
			(item) => item.code === values.currencyCode,
		);
		const salaryMinorUnits = currency
			? parseMajorUnits(salary, currency.minorUnits)
			: undefined;
		if (salaryMinorUnits === undefined || salaryMinorUnits === 0) {
			if (currency)
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["salary"],
					message: currency.minorUnits
						? `Enter a positive amount with up to ${currency.minorUnits} decimal places`
						: "Enter a positive whole amount",
				});
			return z.NEVER;
		}
		return { ...rest, salaryMinorUnits };
	};
}

export const profileSchema = updateEmployeeRequestSchema;
export type ProfileValues = z.input<typeof profileSchema>;
export type ProfileField = keyof ProfileValues;

export function toProfileValues(employee: EmployeeResponse): ProfileValues {
	return {
		code: employee.code,
		name: employee.name,
		countryCode: employee.countryCode,
		departmentId: employee.departmentId,
		jobTitleId: employee.jobTitleId,
		level: employee.level,
		version: employee.version,
	};
}

export const createEmployeeSchema = (currencies: Currencies) =>
	createEmployeeRequestSchema
		.omit({ salaryMinorUnits: true })
		.extend({ salary: salaryText })
		.transform(withMajorSalary(currencies));
export type CreateEmployeeValues = z.input<
	ReturnType<typeof createEmployeeSchema>
>;

export const emptyEmployee: CreateEmployeeValues = {
	code: "",
	name: "",
	countryCode: "",
	departmentId: "",
	jobTitleId: "",
	level: "",
	currencyCode: "",
	salary: "",
};

const salaryFields = updateEmployeeSalaryRequestSchema
	.omit({ salaryMinorUnits: true })
	.extend({
		salary: salaryText,
		// An empty textarea means no reason; anything typed follows the contract.
		reason: z
			.literal("")
			.transform(() => undefined)
			.or(updateEmployeeSalaryRequestSchema.shape.reason),
	});
export const salarySchema = (currencies: Currencies) =>
	salaryFields.transform(withMajorSalary(currencies));
export type SalaryValues = z.input<typeof salaryFields>;

export function toSalaryValues(employee: EmployeeResponse): SalaryValues {
	return {
		currencyCode: employee.currencyCode,
		salary: minorToMajorText(
			employee.salaryMinorUnits,
			employee.currencyMinorUnits,
		),
		reason: "",
		version: employee.version,
	};
}
