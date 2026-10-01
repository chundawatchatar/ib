import { createHealthService } from "./modules/health/health.service.js";
import type { Services } from "./services.js";

export function createTestServices(): Services {
	return {
		health: createHealthService(),
		employees: {
			list: async (query) => ({
				items: [],
				total: 0,
				page: query.page,
				pageSize: query.pageSize,
			}),
		},
	};
}
