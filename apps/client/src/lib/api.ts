import {
	type ApiErrorIssue,
	apiErrorSchema,
	contract,
} from "@salary-manager/contracts";
import { initClient } from "@ts-rest/core";

// Calls `/api` on the page's own origin; Vite proxies it to the API in dev and
// preview. Use it only from feature `api.ts` files, through `unwrap`.
export const apiClient = initClient(contract, { baseUrl: "" });

// Thrown for any unexpected status, so TanStack Query exposes it as `error`.
// `status === 409` is a stale edit; `issues` holds field-level validation errors.
export class ApiError extends Error {
	readonly status: number;
	readonly issues: ApiErrorIssue[];

	constructor(status: number, message: string, issues: ApiErrorIssue[] = []) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.issues = issues;
	}
}

type ApiResponse = { status: number; body: unknown };

function hasStatus<TResponse extends ApiResponse, TStatus extends number>(
	response: TResponse,
	status: TStatus,
): response is Extract<TResponse, { status: TStatus }> {
	return response.status === status;
}

export function unwrap<
	TResponse extends ApiResponse,
	TStatus extends TResponse["status"],
>(
	response: TResponse,
	status: TStatus,
): Extract<TResponse, { status: TStatus }>["body"] {
	if (hasStatus(response, status)) return response.body;
	const error = apiErrorSchema.safeParse(response.body);
	throw error.success
		? new ApiError(response.status, error.data.message, error.data.issues)
		: new ApiError(
				response.status,
				`Request failed with status ${response.status}`,
			);
}

// A message safe to show users: API validation issues are written for people;
// anything else (network failures, 5xx) gets the caller's fallback.
export function errorMessage(error: unknown, fallback: string): string {
	if (!(error instanceof ApiError) || error.status >= 500) return fallback;
	const issues = error.issues.map((issue) => issue.message);
	return issues.length ? issues.join(". ") : error.message;
}
