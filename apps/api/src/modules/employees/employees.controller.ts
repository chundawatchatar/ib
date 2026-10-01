import type { contract } from "@salary-manager/contracts";
import type { AppRouteImplementation } from "@ts-rest/express";
import type { EmployeeService } from "./employees.service";

export function createEmployeeController(
	service: EmployeeService,
): AppRouteImplementation<typeof contract.listEmployees> {
	return async ({ query }) => ({
		status: 200,
		body: await service.list(query),
	});
}

export function createEmployeeDetailsController(
	service: EmployeeService,
): AppRouteImplementation<typeof contract.getEmployee> {
	return async ({ params }) => {
		const result = await service.get(params.id);
		return result.kind === "success"
			? { status: 200, body: result.employee }
			: { status: 404, body: result.error };
	};
}

export function createEmployeeCreationController(
	service: EmployeeService,
): AppRouteImplementation<typeof contract.createEmployee> {
	return async ({ body }) => {
		const result = await service.create(body);
		if (result.kind === "success")
			return { status: 201, body: result.employee };
		return result.kind === "invalid"
			? { status: 400, body: result.error }
			: { status: 409, body: result.error };
	};
}

export function createEmployeeUpdateController(
	service: EmployeeService,
): AppRouteImplementation<typeof contract.updateEmployee> {
	return async ({ params, body }) => {
		const result = await service.update(params.id, body);
		if (result.kind === "success")
			return { status: 200, body: result.employee };
		if (result.kind === "notFound") return { status: 404, body: result.error };
		return result.kind === "invalid"
			? { status: 400, body: result.error }
			: { status: 409, body: result.error };
	};
}

export function createEmployeeDeactivationController(
	service: EmployeeService,
): AppRouteImplementation<typeof contract.deactivateEmployee> {
	return async ({ params, body }) => {
		const result = await service.deactivate(params.id, body.version);
		if (result.kind === "success")
			return { status: 200, body: result.employee };
		return result.kind === "notFound"
			? { status: 404, body: result.error }
			: { status: 409, body: result.error };
	};
}

export function createEmployeeSalaryUpdateController(
	service: EmployeeService,
): AppRouteImplementation<typeof contract.updateEmployeeSalary> {
	return async ({ params, body }) => {
		const result = await service.updateSalary(params.id, body);
		if (result.kind === "success")
			return { status: 200, body: result.employee };
		if (result.kind === "notFound") return { status: 404, body: result.error };
		return result.kind === "invalid"
			? { status: 400, body: result.error }
			: { status: 409, body: result.error };
	};
}
