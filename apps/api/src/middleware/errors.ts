import type { ApiError, ApiErrorIssue } from "@salary-manager/contracts";
import { RequestValidationError } from "@ts-rest/express";
import type { ErrorRequestHandler, RequestHandler } from "express";
import type { Logger } from "../logger.js";

export const notFound: RequestHandler = (_request, response) => {
	const body: ApiError = { message: "Route not found" };
	response.status(404).json(body);
};

// Specific messages for the JSON parser errors clients commonly trigger.
const parserMessages: Record<string, string> = {
	"entity.parse.failed": "Invalid JSON body",
	"entity.too.large": "Request body too large",
	"charset.unsupported": "Unsupported request charset",
	"encoding.unsupported": "Unsupported request encoding",
};

function validationIssues(error: RequestValidationError): ApiErrorIssue[] {
	const sources: [ApiErrorIssue["location"], RequestValidationError["body"]][] =
		[
			["params", error.pathParams],
			["headers", error.headers],
			["query", error.query],
			["body", error.body],
		];
	return sources.flatMap(([location, zodError]) =>
		(zodError?.issues ?? []).map((issue) => ({
			location,
			path: issue.path.join("."),
			message: issue.message,
		})),
	);
}

// Errors from body-parser/http-errors mark client faults with a 4xx `status`
// and `expose: true`; keep that status instead of reporting a server failure.
function clientError(error: unknown): { status: number; type?: string } | null {
	if (
		typeof error !== "object" ||
		error === null ||
		!("status" in error) ||
		!("expose" in error) ||
		error.expose !== true ||
		typeof error.status !== "number" ||
		error.status < 400 ||
		error.status > 499
	)
		return null;
	const type =
		"type" in error && typeof error.type === "string" ? error.type : undefined;
	return { status: error.status, type };
}

function toResponse(error: unknown): { status: number; body: ApiError } {
	if (error instanceof RequestValidationError) {
		const issues = validationIssues(error);
		return {
			status: 400,
			body: issues.length
				? { message: "Invalid request", issues }
				: { message: "Invalid request" },
		};
	}
	const client = clientError(error);
	if (client)
		return {
			status: client.status,
			body: {
				message:
					(client.type && parserMessages[client.type]) || "Invalid request",
			},
		};
	return { status: 500, body: { message: "Internal server error" } };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
	return (error: unknown, request, response, next) => {
		if (response.headersSent) {
			next(error);
			return;
		}
		const { status, body } = toResponse(error);
		if (status === 500) {
			logger.error({
				event: "request.failed",
				requestId: String(response.getHeader("x-request-id")),
				method: request.method,
				status,
			});
		}
		response.status(status).json(body);
	};
}
