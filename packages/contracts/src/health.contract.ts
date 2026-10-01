import { ROUTE } from "@salary-manager/common";
import { initContract } from "@ts-rest/core";
import { contractOptions } from "./contract-options";
import { healthResponseSchema } from "./health";

const c = initContract();

export const healthContract = c.router(
	{
		health: {
			method: "GET",
			path: ROUTE.HEALTH,
			responses: { 200: healthResponseSchema },
		},
	},
	contractOptions,
);
