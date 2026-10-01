import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";

export const currencies = pgTable(
	"currencies",
	{
		code: varchar("code", { length: 3 }).primaryKey(),
		name: text("name").notNull(),
		minorUnits: integer("minor_units").notNull(),
	},
	(t) => [
		check("currencies_code_valid", sql`${t.code} ~ '^[A-Z]{3}$'`),
		check("currencies_precision_valid", sql`${t.minorUnits} between 0 and 6`),
		check("currencies_name_valid", sql`length(trim(${t.name})) > 0`),
	],
);

export type Currency = typeof currencies.$inferSelect;
