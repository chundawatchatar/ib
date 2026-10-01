---
name: api-endpoints
description: "Implement or change HTTP API endpoints, shared contracts, route constants, and shared types using the repository's runtime validation and persistence conventions. Use for endpoint implementation or shared API/type changes."
---

# API Endpoints

Use this guide when adding or changing HTTP endpoints. It is plain Markdown for any coding agent; repository instructions, requirements, installed tooling, and the user's current request determine the implementation.

## Establish the behavior

Read the repository instructions and relevant requirements, then inspect existing contracts, routing, application startup, services, persistence, and adjacent tests. Reuse the chosen framework and conventions. Clarify missing behavior that changes correctness; do not expand product scope or introduce a new framework to follow this guide.

Identify accepted input, successful output, relevant error responses, side effects, and compatibility implications before implementation. Prefer existing validation and error policies; document intentional changes to the public interface.

## Shared contracts, routes, and types

Use ts-rest for end-to-end API type safety, with clients and servers consuming the shared contracts.

- Define API contracts and endpoint Zod schemas in `packages/contracts`. Export named request and response types using `z.infer<typeof schema>` from the same schemas referenced by the ts-rest contract. Include query, path parameter, request body, and response body types where applicable; do not duplicate schema shapes as handwritten interfaces.
- Define route path constants in `packages/common` and use them in contracts. Export them through the common package's public entry point; do not repeat route strings in clients or handlers.
- Keep global/shared types used across projects in `packages/common` and export them through its public entry point. When these types need runtime validation, define their Zod schemas in common and infer the types there so contracts can reuse the schemas.
- Keep common independent of every other local workspace package: no imports, re-exports, or dependencies on contracts, applications, or sibling packages, including type-only and cross-project relative imports. Its own files and external dependencies are allowed. Contracts and applications may depend on common.

For example, export aliases alongside their endpoint schemas in contracts, or alongside shared schemas in common:

```ts
export type CreateEmployeeRequest = z.infer<typeof createEmployeeRequestSchema>;
export type EmployeeResponse = z.infer<typeof employeeResponseSchema>;
```

## Implement the boundary

- Update the shared schemas, exported inferred types, and contract before the handler. Use those shared definitions in clients and servers.
- Validate external input at runtime. Narrow unknown values, bound query sizes, allowlist dynamic sort/group fields, and parameterize database values.
- Keep `@salary-manager/domain` (Drizzle tables and inferred row types) server-only. Map database rows into the contract's response schemas; never expose row types through contracts or common. Read the database-schema skill before changing tables.
- Keep handlers focused on request orchestration. Keep domain/query logic in its owning backend project; separate concerns where behavior or testability warrants it, without adding a generic architecture by default.
- Ensure middleware and handlers emit the documented status/body shapes for validation and domain failures. Preserve configured response validation. Avoid exposing internal errors or secrets in responses.
- For state changes, preserve the required transaction, concurrency, and audit invariants. Invalid or stale requests must not produce partial writes. Retry or idempotency behavior should follow the actual API requirements.
- Keep listing responses bounded and sorting stable. Counts and aggregates must describe the agreed population rather than only the visible page. Preserve units and grouping semantics for amounts or other measured values.
- Keep listener startup separate from importable application logic. Use testable dependencies for stateful operations when needed; avoid unrelated startup refactors.

## Verify the change

Add meaningful success and relevant failure-path coverage. Validate actual HTTP responses against the contract, and use real persistence tests for claims about transactions or constraints. A mocked service return does not prove the middleware, database, or response boundary works.

Run the affected project tests/typechecks and repository lint/format checks using its pinned toolchain. Build when package imports, bundling, or startup are affected. Report behavior changed, compatibility considerations, executed checks, and any blocked verification accurately. Do not silently skip a test because its environment needs a local listening socket.
