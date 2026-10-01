import { ROUTE } from "@salary-manager/common";
import { initContract } from "@ts-rest/core";
import { contractOptions } from "./contract-options";
import { referenceDataResponseSchema } from "./reference-data";

const c = initContract();

export const referenceDataContract = c.router(
	{
		getReferenceData: {
			method: "GET",
			path: ROUTE.REFERENCE_DATA,
			responses: { 200: referenceDataResponseSchema },
		},
	},
	contractOptions,
);
