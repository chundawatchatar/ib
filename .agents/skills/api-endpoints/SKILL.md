---
name: api-endpoints
description: "Implement or change HTTP API endpoints end to end: shared ts-rest contract and Zod schemas, route constants, the feature module (controller, service, queries) in apps/api, service wiring, error responses, tests, and docs. Use for any endpoint or shared API/type change."
---

# API Endpoints

Follow this for every new or changed endpoint. The employee directory (`GET /api/employees`) is the reference implementation: read `packages/contracts/src/employees.ts` and `apps/api/src/modules/employees/` before starting. Read [database-schema](../database-schema/SKILL.md) if tables change and [backend-tests](../backend-tests/SKILL.md) for test rules.

## Before coding

Read the requirement and acceptance criteria in `docs/requirements.md` and the item in `docs/plan.md`. Decide the inputs, the success response, the expected failures (404, 409, …), side effects, and whether the endpoint reads or writes. Clarify anything that changes correctness; do not widen scope.

## 1. Contract (`packages/contracts`, `packages/common`)

- Add the path to `ROUTE` in `packages/common/src/routes.ts`. Never repeat path strings elsewhere.
- Keep `packages/common` independent: it must not import, re-export, or depend on contracts, apps, or any other workspace package (type-only imports included). Types and Zod schemas shared across projects that are not API-specific go in common; contracts and apps may depend on it.
- Put the feature's Zod schemas and inferred types in `packages/contracts/src/<feature>.ts` (query, params, body, response), and export them from `index.ts`. Never hand-write request or response types.
- Add the route to `contract` in `index.ts`, named `<verb><Resource>` (`listEmployees`, `getEmployee`, `updateEmployeeSalary`).
- `400`, `413`, `415`, and `500` are shared `commonResponses` with `{ message, issues? }`. Declare each endpoint's expected domain errors (such as `404` or a stale-edit `409`) on the route using `apiErrorSchema`.
- Query parameters:
  - Build them from the shared helpers in `src/query.ts`: `paginationQuery` (page size capped at 100), `integerQuery(min, max)`, and `textQuery(max)` (trimmed, no control characters).
  - Use `.strict()` so unknown keys return 400. Sort fields are an explicit enum, never a raw column name.
  - Put cross-field rules in `.superRefine` with a `path`, so the error names the field.
- Response schemas are bounded (`max` on arrays) and expose contract shapes, never database rows.
- Money is integer minor units plus an explicit currency code (and its `minorUnits` when the client must format it).

## 2. Feature module (`apps/api/src/modules/<feature>/`)

| File | Owns |
| --- | --- |
| `<feature>.controller.ts` | Maps the validated request to a service call and returns `{ status, body }`. Typed with `AppRouteImplementation<typeof contract.<route>>`. No business rules and no queries. Returns declared domain errors (`404`, `409`); lets unexpected errors propagate. |
| `<feature>.service.ts` | Business rules and transaction boundaries. `create<Feature>Service(db)` returns an object; export its type. Several reads that must agree use one read-only `repeatable read` transaction. Writes check `version`, update, and write audit rows in one transaction. |
| `<feature>.queries.ts` | Parameterized Drizzle queries over `@salary-manager/domain` tables. Accept `Pick<Database, "select">` or a transaction so the service controls it. Map rows to the contract shape. |

- One controller, service, and queries file per **feature**, not per endpoint; the feature's endpoints share loading, version checks, and row mapping there. When the service passes about 300 lines, or one operation has substantial logic of its own (for example the salary update), move that operation into its own file in the module (`update-salary.ts`) and call it from the service. The service object stays the only surface used by the controller and `services.ts`.
- Filtering, sorting, pagination, counts, and aggregates run in SQL over the full matching population, never in JavaScript on one page.
- Sorting always adds `id` as a final tiebreaker so pages are stable.
- Treat search as literal text: escape `%`, `_`, and `\` before `ilike`.
- Never build SQL from strings; use Drizzle operators or `sql` with bound values.
- No generic repositories or base controllers.

## 3. Wiring

- `src/services.ts`: add the service to `createServices(db)`.
- `src/router.ts`: register the controller under the contract route name.
- `src/test-services.ts`: add a harmless default implementation so HTTP tests for other features keep compiling.
- `createApp({ services })` requires services; `start.ts` builds them from the real database connection. Do not add middleware or change startup for a single endpoint.

## 4. Errors and safety

- Request validation and JSON parsing errors are handled centrally: 400 with field `issues`, 413, or 415. Do not re-validate in controllers.
- Expected outcomes (not found, stale version) are explicit contract responses, not thrown errors.
- Never put raw database errors, SQL, or stack traces in responses. Unexpected errors become a generic 500 and are logged by the error handler.
- Response validation stays on: a response that breaks the contract is a 500, which surfaces bugs early.

## 5. Tests

- `<feature>.test.ts` (fast, no database): start `createApp({ services: { ...createTestServices(), <feature>: { method: vi.fn() } } })` on an ephemeral loopback port. Cover:
  - defaults and parsed values reaching the service
  - every invalid input returning 400 with `issues` and the service **not** called
  - declared domain errors
  - responses parsed with the contract schema
- `<feature>.integration.test.ts` (real PostgreSQL, run by `pnpm test:db`): use `createTestDatabase()` from `@salary-manager/domain/testing` in `beforeEach` and `drop()` in `afterEach`, then call the API through `startApi(databaseUrl, 0)`. Cover:
  - combined filters and correct totals
  - stable paging in both sort directions
  - transactions and rollback, stale-version conflicts, and audit rows for writes
  - one run against the full 10,000-employee seed for list endpoints
- Never import another package's `src/` files by relative path; use its public or `/testing` entry points.
- Use the requirements' worked examples as expected values for calculations.

## 6. Finish

- Document the endpoint in `apps/api/README.md`: method, path, parameters table, response shape, and errors.
- Record any real trade-off in `docs/decisions.md`. Move the item to Done in `docs/plan.md`.
- For list or search endpoints, measure response time over the seeded data and record it before claiming the performance target.
- Run `pnpm check` and `pnpm test:db`, and report what each proved.
