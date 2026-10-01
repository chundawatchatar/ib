import { bigint, timestamp } from "drizzle-orm/pg-core";

// Largest salary in minor units that JavaScript numbers represent exactly.
export const MAX_SALARY_MINOR_UNITS = "9007199254740991";

// Salaries use number mode only within the safe integer range enforced by checks.
export const salary = (name: string) =>
	bigint(name, { mode: "number" }).notNull();
export const time = (name: string) =>
	timestamp(name, { withTimezone: true }).notNull().defaultNow();
