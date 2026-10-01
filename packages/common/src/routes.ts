export const ROUTE = {
	PAY_INSIGHTS_GROUPS: "/api/insights/groups",
	PAY_INSIGHTS_HISTOGRAM: "/api/insights/histogram",
	PAY_INSIGHTS_SUMMARY: "/api/insights/summary",
	EMPLOYEES: "/api/employees",
	EMPLOYEE: "/api/employees/:id",
	DEACTIVATE_EMPLOYEE: "/api/employees/:id/deactivate",
	EMPLOYEE_SALARY: "/api/employees/:id/salary",
	HEALTH: "/api/health",
	REFERENCE_DATA: "/api/reference-data",
} as const;
