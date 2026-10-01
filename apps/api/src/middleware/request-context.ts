import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { Logger } from "../logger.js";

export function requestContext(logger: Logger): RequestHandler {
	return (request, response, next) => {
		const suppliedId = request.header("x-request-id");
		const requestId =
			suppliedId && /^[a-zA-Z0-9_-]{1,100}$/.test(suppliedId)
				? suppliedId
				: randomUUID();
		const started = performance.now();
		response.setHeader("x-request-id", requestId);
		response.setHeader("x-content-type-options", "nosniff");
		response.once("finish", () => {
			logger.info({
				event: "request.completed",
				requestId,
				method: request.method,
				status: response.statusCode,
				durationMs: performance.now() - started,
			});
		});
		next();
	};
}
