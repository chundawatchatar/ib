import { sql } from "drizzle-orm";
import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const departments = pgTable(
	"departments",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull().unique(),
	},
	(t) => [check("departments_name_valid", sql`length(trim(${t.name})) > 0`)],
);

export type Department = typeof departments.$inferSelect;
