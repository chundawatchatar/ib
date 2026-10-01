import type { HealthResponse } from "@salary-manager/contracts";

export function createHealthService() {
	return {
		getHealth: (): HealthResponse => ({ status: "ok" }),
	};
}

export type HealthService = ReturnType<typeof createHealthService>;
