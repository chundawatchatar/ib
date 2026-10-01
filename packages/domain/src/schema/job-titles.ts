import { sql } from "drizzle-orm";
import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";

// Titles can be shared across departments; employees carry both references.
export const jobTitles = pgTable(
	"job_titles",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull().unique(),
	},
	(t) => [check("job_titles_name_valid", sql`length(trim(${t.name})) > 0`)],
);

export type JobTitle = typeof jobTitles.$inferSelect;
