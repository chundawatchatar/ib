import type { contract } from "@salary-manager/contracts";
import type { AppRouteImplementation } from "@ts-rest/express";
import type { HealthService } from "./health.service";

export function createHealthController(
	service: HealthService,
): AppRouteImplementation<typeof contract.health> {
	return async () => ({ status: 200, body: service.getHealth() });
}
