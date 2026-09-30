import { ROUTE } from "@payroll/common";
import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const contract = c.router({
	health: {
		method: "GET",
		path: ROUTE.HEALTH,
		responses: {
			200: z.object({ status: z.literal("ok") }),
		},
	},
});
