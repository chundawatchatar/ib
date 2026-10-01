import { createHealthService } from "./modules/health/health.service.js";

export function createServices() {
	return { health: createHealthService() };
}

export type Services = ReturnType<typeof createServices>;
