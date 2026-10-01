import type { contract } from "@salary-manager/contracts";
import type { AppRouteImplementation } from "@ts-rest/express";
import type { ReferenceDataService } from "./reference-data.service";

export function createReferenceDataController(
	service: ReferenceDataService,
): AppRouteImplementation<typeof contract.getReferenceData> {
	return async () => ({ status: 200, body: await service.get() });
}
