import { z } from "zod";

// Query strings arrive as text; these helpers parse and bound them so every
// endpoint rejects bad input as a 400 before it reaches the database.

/** A whole number within [minimum, maximum], parsed from a query string. */
export const integerQuery = (minimum: number, maximum: number) =>
	z
		.string()
		.regex(/^\d+$/)
		.transform(Number)
		.pipe(z.number().int().min(minimum).max(maximum));

/**
 * Trimmed free text up to `maximum` characters. Control characters are
 * rejected: PostgreSQL refuses NUL bytes in text, which would otherwise be a 500.
 */
export const textQuery = (maximum: number) =>
	z
		.string()
		.trim()
		.max(maximum)
		.refine((value) => !/\p{Cc}/u.test(value), {
			message: "Must not contain control characters",
		});

/** Standard page and page-size parameters; page size is capped at 100. */
export const paginationQuery = {
	page: integerQuery(1, 1_000_000).default("1"),
	pageSize: integerQuery(1, 100).default("25"),
};
