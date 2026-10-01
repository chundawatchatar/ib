import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { MAX_SALARY_MINOR_UNITS, salary, time } from "./columns";
import { currencies } from "./currencies";
import { employees } from "./employees";

// One row per salary edit, written in the same transaction as the update.
export const salaryChanges = pgTable(
	"salary_changes",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		employeeId: uuid("employee_id")
			.notNull()
			.references(() => employees.id, { onDelete: "restrict" }),
		oldSalaryMinorUnits: salary("old_salary_minor_units"),
		newSalaryMinorUnits: salary("new_salary_minor_units"),
		oldCurrencyCode: varchar("old_currency_code", { length: 3 })
			.notNull()
			.references(() => currencies.code),
		newCurrencyCode: varchar("new_currency_code", { length: 3 })
			.notNull()
			.references(() => currencies.code),
		// The employee version this change produced; always > 1.
		employeeVersion: integer("employee_version").notNull(),
		changedAt: time("changed_at"),
		reason: text("reason"),
	},
	(t) => [
		check(
			"salary_changes_amounts_valid",
			sql`${t.oldSalaryMinorUnits} between 1 and ${sql.raw(MAX_SALARY_MINOR_UNITS)} and ${t.newSalaryMinorUnits} between 1 and ${sql.raw(MAX_SALARY_MINOR_UNITS)}`,
		),
		check("salary_changes_version_valid", sql`${t.employeeVersion} > 1`),
		unique("salary_changes_employee_version_unique").on(
			t.employeeId,
			t.employeeVersion,
		),
		index("salary_changes_employee_date_idx").on(t.employeeId, t.changedAt),
	],
);

export type SalaryChange = typeof salaryChanges.$inferSelect;
