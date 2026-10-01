import { contract } from "@salary-manager/contracts";
import { createExpressEndpoints } from "@ts-rest/express";
import express, { type Express } from "express";
import { consoleLogger, type Logger } from "./logger.js";
import { errorHandler, notFound } from "./middleware/errors.js";
import { requestContext } from "./middleware/request-context.js";
import { createRouter } from "./router.js";
import { createServices, type Services } from "./services.js";

type AppDependencies = {
	services?: Services;
	logger?: Logger;
};

export function createApp({
	services = createServices(),
	logger = consoleLogger,
}: AppDependencies = {}): Express {
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
