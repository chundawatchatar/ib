import { sql } from "drizzle-orm";
import { check, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { currencies } from "./currencies";

export const countries = pgTable(
	"countries",
	{
		code: varchar("code", { length: 2 }).primaryKey(),
		name: text("name").notNull(),
		// A suggestion only; employees always store their salary currency.
		defaultCurrencyCode: varchar("default_currency", { length: 3 }).references(
			() => currencies.code,
		),
	},
	(t) => [
		check("countries_code_valid", sql`${t.code} ~ '^[A-Z]{2}$'`),
		check("countries_name_valid", sql`length(trim(${t.name})) > 0`),
	],
);

export type Country = typeof countries.$inferSelect;
