import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	integer,
	pgTable,
	text,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { MAX_SALARY_MINOR_UNITS, salary, time } from "./columns.js";
import { countries } from "./countries.js";
import { currencies } from "./currencies.js";
import { departments } from "./departments.js";
import { jobTitles } from "./job-titles.js";

export const employees = pgTable(
	"employees",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		code: text("code").notNull().unique(),
		name: text("name").notNull(),
		countryCode: varchar("country_code", { length: 2 })
			.notNull()
			.references(() => countries.code),
		currencyCode: varchar("currency_code", { length: 3 })
			.notNull()
			.references(() => currencies.code),
		departmentId: uuid("department_id")
			.notNull()
			.references(() => departments.id),
		level: text("level").notNull(),
		jobTitleId: uuid("job_title_id")
			.notNull()
			.references(() => jobTitles.id),
		salaryMinorUnits: salary("salary_minor_units"),
		// Employees are deactivated, never deleted, so salary history survives.
		active: boolean("active").notNull().default(true),
		// Optimistic lock: writes must match and increment the version they read.
		version: integer("version").notNull().default(1),
		createdAt: time("created_at"),
		// Set by write workflows; there is no update trigger.
		updatedAt: time("updated_at"),
	},
	(t) => [
		check(
			"employees_salary_valid",
			sql`${t.salaryMinorUnits} between 1 and ${sql.raw(MAX_SALARY_MINOR_UNITS)}`,
		),
		check("employees_version_valid", sql`${t.version} > 0`),
		check(
			"employees_text_valid",
			sql`length(trim(${t.code})) > 0 and length(trim(${t.name})) > 0 and length(trim(${t.level})) > 0`,
		),
		index("employees_country_idx").on(t.countryCode),
		index("employees_currency_idx").on(t.currencyCode),
		index("employees_department_idx").on(t.departmentId),
		index("employees_job_title_idx").on(t.jobTitleId),
		index("employees_level_idx").on(t.level),
		index("employees_salary_idx").on(t.salaryMinorUnits),
	],
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
