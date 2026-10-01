import { apiErrorSchema } from "./errors";

export const contractOptions = {
	commonResponses: {
		400: apiErrorSchema,
		413: apiErrorSchema,
		415: apiErrorSchema,
		500: apiErrorSchema,
	},
};
