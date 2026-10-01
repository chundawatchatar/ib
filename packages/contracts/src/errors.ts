import { z } from "zod";

// Field-level validation problems, so clients can show errors next to inputs.
export const apiErrorIssueSchema = z.object({
	location: z.enum(["body", "query", "params", "headers"]),
	path: z.string(),
	message: z.string(),
});

export const apiErrorSchema = z.object({
	message: z.string(),
	issues: z.array(apiErrorIssueSchema).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorIssue = z.infer<typeof apiErrorIssueSchema>;
