import type {
	ApiError,
	CreateEmployeeRequest,
	EmployeeDirectoryQuery,
	EmployeeDirectoryResponse,
	EmployeeResponse,
	UpdateEmployeeRequest,
} from "@salary-manager/contracts";
import type { Database } from "@salary-manager/domain";
import * as queries from "./employees.queries";

type Success = { kind: "success"; employee: EmployeeResponse };
type Failure<K extends string> = { kind: K; error: ApiError };
type CreateResult = Success | Failure<"invalid" | "conflict">;
type GetResult = Success | Failure<"notFound">;
type ChangeResult = CreateResult | Failure<"notFound">;

const notFound: Failure<"notFound"> = {
	kind: "notFound",
	error: { message: "Employee not found" },
};
const stale: Failure<"conflict"> = {
	kind: "conflict",
	error: { message: "Employee has changed; reload before saving" },
};
const duplicate: Failure<"conflict"> = {
	kind: "conflict",
	error: {
		message: "Employee code already exists",
		issues: [
			{
				location: "body",
				path: "code",
				message: "Employee code already exists",
			},
		],
	},
};
function invalidReferences(fields: string[]): Failure<"invalid"> {
	return {
		kind: "invalid",
		error: {
			message: "Invalid employee references",
			issues: fields.map((path) => ({
				location: "body",
				path,
				message: "Unknown reference",
			})),
		},
	};
}

function duplicateCode(error: unknown): boolean {
	// Drizzle wraps driver errors in `cause`; narrow both boundaries.
	for (
		let depth = 0;
		depth < 3 && typeof error === "object" && error !== null;
		depth++
	) {
		if (
			"code" in error &&
			error.code === "23505" &&
			"constraint" in error &&
			error.constraint === "employees_code_unique"
		)
			return true;
		error = "cause" in error ? error.cause : undefined;
	}
	return false;
}
async function savedEmployee(
	db: Pick<Database, "select">,
	id: string,
): Promise<Success> {
	const employee = await queries.getEmployee(db, id);
	if (!employee) throw new Error("Saved employee missing");
	return { kind: "success", employee };
}

export function createEmployeeService(db: Database) {
	return {
		list: (query: EmployeeDirectoryQuery): Promise<EmployeeDirectoryResponse> =>
			db.transaction((tx) => queries.listEmployees(tx, query), {
				isolationLevel: "repeatable read",
				accessMode: "read only",
			}),
		get: async (id: string): Promise<GetResult> => {
			const employee = await queries.getEmployee(db, id);
			return employee ? { kind: "success", employee } : notFound;
		},
		create: (body: CreateEmployeeRequest): Promise<CreateResult> =>
			db.transaction(async (tx) => {
				const missing = await queries.invalidEmployeeReferences(tx, body);
				if (missing.length) return invalidReferences(missing);
				const id = await queries.insertEmployee(tx, body);
				return id ? savedEmployee(tx, id) : duplicate;
			}),
		update: async (
			id: string,
			body: UpdateEmployeeRequest,
		): Promise<ChangeResult> => {
			try {
				return await db.transaction(async (tx): Promise<ChangeResult> => {
					const employee = await queries.lockEmployee(tx, id);
					if (!employee) return notFound;
					if (employee.version !== body.version) return stale;
					const missing = await queries.invalidEmployeeReferences(tx, body);
					if (missing.length) return invalidReferences(missing);
					await queries.updateEmployee(tx, id, body);
					return savedEmployee(tx, id);
				});
			} catch (error) {
				if (duplicateCode(error)) return duplicate;
				throw error;
			}
		},
		deactivate: (
			id: string,
			version: number,
		): Promise<GetResult | Failure<"conflict">> =>
			db.transaction(async (tx) => {
				const employee = await queries.lockEmployee(tx, id);
				if (!employee) return notFound;
				if (employee.version !== version) return stale;
				// A retry with the current inactive version is a no-op.
				if (employee.active) await queries.deactivateEmployee(tx, id, version);
				return savedEmployee(tx, id);
			}),
	};
}

export type EmployeeService = ReturnType<typeof createEmployeeService>;
