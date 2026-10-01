import { contract } from "@salary-manager/contracts";
import { createExpressEndpoints } from "@ts-rest/express";
import express, { type Express } from "express";
import { consoleLogger, type Logger } from "./logger";
import { errorHandler, notFound } from "./middleware/errors";
import { requestContext } from "./middleware/request-context";
import { createRouter } from "./router";
import type { Services } from "./services";

type AppDependencies = {
	services: Services;
	logger?: Logger;
};

export function createApp({
	services,
	logger = consoleLogger,
}: AppDependencies): Express {
	const app = express();
	app.disable("x-powered-by");
	app.use(requestContext(logger));
	app.use(express.json({ limit: "64kb" }));
	createExpressEndpoints(contract, createRouter(services), app, {
		responseValidation: true,
		requestValidationErrorHandler: (error, _request, _response, next) =>
			next(error),
	});
	app.use(notFound);
	app.use(errorHandler(logger));
	return app;
}
