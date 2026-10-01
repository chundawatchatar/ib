import { createHealthService } from "./modules/health/health.service";
import type { Services } from "./services";

export function createTestServices(): Services {
	return {
		insights: {
			groups: async (query) => ({
				kind: "success",
				report: {
					view: query.view,
					groupBy: query.groupBy,
					headcount: 0,
					rateDate: null,
					groups: [],
				},
			}),
			histogram: async (query) => ({
				kind: "success",
				report: {
					view: query.view,
					headcount: 0,
					rateDate: null,
					distributions: [],
				},
			}),
			summary: async () => ({
				kind: "success",
				report: { view: "local", headcount: 0, rateDate: null, summaries: [] },
			}),
		},
		health: createHealthService(),
		employees: {
			get: async () => ({
				kind: "notFound",
				error: { message: "Employee not found" },
			}),
			create: async () => ({
				kind: "invalid",
				error: { message: "Test service not configured" },
			}),
			update: async () => ({
				kind: "notFound",
				error: { message: "Employee not found" },
			}),
			updateSalary: async () => ({
				kind: "notFound",
				error: { message: "Employee not found" },
			}),
			deactivate: async () => ({
				kind: "notFound",
				error: { message: "Employee not found" },
			}),
			list: async (query) => ({
				items: [],
				total: 0,
				page: query.page,
				pageSize: query.pageSize,
			}),
		},
	};
}
