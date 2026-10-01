import { z } from "zod";

const namedId = z.object({ id: z.string().uuid(), name: z.string() });

export const referenceDataResponseSchema = z.object({
	countries: z
		.array(
			z.object({
				code: z.string().regex(/^[A-Z]{2}$/),
				name: z.string(),
				defaultCurrencyCode: z
					.string()
					.regex(/^[A-Z]{3}$/)
					.nullable(),
			}),
		)
		.max(250),
	currencies: z
		.array(
			z.object({
				code: z.string().regex(/^[A-Z]{3}$/),
				name: z.string(),
				minorUnits: z.number().int().min(0).max(6),
			}),
		)
		.max(250),
	departments: z.array(namedId).max(1000),
	jobTitles: z.array(namedId).max(1000),
	levels: z
		.array(z.string())
		.max(1000)
		.describe(
			"Distinct levels in use by any employee, in English natural numeric order (L2 before L10).",
		),
});
export type ReferenceDataResponse = z.infer<typeof referenceDataResponseSchema>;
