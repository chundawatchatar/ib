import { sql } from "drizzle-orm";
import {
	check,
	date,
	numeric,
	pgTable,
	primaryKey,
	varchar,
} from "drizzle-orm/pg-core";
import { currencies } from "./currencies.js";

// Static dated rates; reports state the rate date they convert at.
export const fxRates = pgTable(
	"fx_rates",
	{
		sourceCurrencyCode: varchar("source_currency_code", { length: 3 })
			.notNull()
			.references(() => currencies.code),
		targetCurrencyCode: varchar("target_currency_code", { length: 3 })
			.notNull()
			.references(() => currencies.code),
		rateDate: date("rate_date").notNull(),
		rate: numeric("rate").notNull(),
	},
	(t) => [
		primaryKey({
			columns: [t.sourceCurrencyCode, t.targetCurrencyCode, t.rateDate],
		}),
		check(
			"fx_rates_rate_valid",
			sql`${t.rate} > 0 and ${t.rate} < 'Infinity'::numeric`,
		),
	],
);

export type FxRate = typeof fxRates.$inferSelect;
