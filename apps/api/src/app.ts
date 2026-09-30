import { contract } from "@payroll/contracts";
import { createExpressEndpoints, initServer } from "@ts-rest/express";
import express, { type Express } from "express";

export const app: Express = express();

app.use(express.json());

const s = initServer();

const router = s.router(contract, {
	health: async () => ({
		status: 200,
		body: { status: "ok" },
	}),
});

createExpressEndpoints(contract, router, app, {
	responseValidation: true,
});
