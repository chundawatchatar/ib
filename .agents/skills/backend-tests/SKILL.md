---
name: backend-tests
description: "Write deterministic backend unit, database integration, HTTP, and API contract regression tests using the repository's test runner. Use for backend test work, not frontend component tests."
---

# Backend Tests

Use this guide for unit, database integration, HTTP, or API contract regression tests. Follow the repository's runner and test organization; do not replace existing tooling or assume a particular coding agent.

## Choose the behavior and layer

Read the requirements, changed code/contracts, and neighboring tests. Name the observable rule or regression before choosing assertions. Use the smallest layer that proves it:

- Pure domain tests for parsing, calculations, validation, and policy decisions.
- Real database tests for constraints, query behavior, transactions, audit records, and concurrent writes.
- HTTP tests for routing, middleware validation, documented status/body shapes, and API compatibility.

Do not use HTTP requests for every arithmetic branch or fully mocked repositories to claim transactional correctness. For a bug fix, establish that the regression case fails without the fix.

## Isolate the test

Use small explicit fixtures, deterministic IDs/time, and fresh temporary or in-memory databases where applicable. Apply actual migrations when testing schema behavior. Restore clocks, mocks, and globals, and close servers/connections in teardown. Keep tests independent of execution order, uncontrolled randomness, external services, and real-time sleeps.

For real HTTP tests, use loopback and an ephemeral port, wait for readiness, and close the listener after success or failure. Validate parsed JSON as unknown through the project's runtime response schemas. If permissions block sockets, report the limitation and use the authorized runner; do not claim a direct handler call verifies the HTTP boundary.

## Select meaningful cases

- Success and relevant invalid, missing, duplicate, conflict, or unauthorized cases according to the actual endpoint contract.
- Precision, units, conversion dates, overflow bounds, empty/singleton datasets, and rounding/statistical definitions when calculations are affected.
- Atomicity: induce a relevant real error and verify stored values and related records remain consistent. For optimistic locking, two writes with the same expected version must follow the defined conflict behavior.
- Combined filters, stable pagination, full matching counts, aggregate populations, and excluded-record rules when queries change.

Use requirements examples or independently calculated fixtures as the oracle. Assert explicit expected results; do not call production calculation code to generate its own expected output. Assert externally visible results and persisted state rather than only mock call counts or private helper structure.

Keep ordinary unit fixtures small. Test full seed correctness separately when required. Measure performance independently with environment/timings recorded; avoid flaky elapsed-time assertions in deterministic unit suites.

## Run and report

Run the relevant test and typecheck scripts, then repository lint/format checks. Add a project-owned test script/config only if tests are introduced into a project that lacks one. Report exactly which suites ran and the behaviors they prove, including limitations; a coverage percentage alone does not establish correctness.
