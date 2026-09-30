---
name: frontend-tests
description: "Write component, form, and frontend workflow tests using the repository's UI framework and test tooling. Use for frontend regression coverage, not backend tests or full browser end-to-end testing."
---

# Frontend Tests

Use this guide for component, form, and frontend workflow tests. Use the repository's UI framework, runner, environment, and existing request-mocking conventions. The guidance is independent of the coding agent.

## Test what the user can observe

Read repository instructions, requirements, the affected UI, and adjacent tests. Keep shared component tests with the component library and feature tests with their owning application.

For React Testing Library, query by accessible roles/names or labels and assert rendered behavior. Prefer interaction with real components over assertions about internal state, hook implementations, or large tree snapshots. Assert styling attributes only when styling/state is the behavior under test.

Reuse existing test configuration and cleanup. In projects with separate component and application-build configurations, do not import the entire production server/build plugin chain into component tests unnecessarily.

## Exercise interactions and asynchronous states

Use established interaction helpers, awaiting asynchronous interactions. Prefer user-event when already present and appropriate; do not add a dependency solely for this guide. Use asynchronous queries for appearing UI and waitFor for eventual assertions. Avoid sleeps or side effects inside retried assertion callbacks.

Keep the UI and its data logic real. Control the network/client boundary with fixtures matching API contracts instead of mocking away the component or hooks whose behavior is under test. Reuse request-mocking infrastructure if present. Control response timing to expose pending behavior deterministically.

Supply only the real router/providers needed by the component. Isolate caches, storage, clocks, mocks, and globals; restore extra state beyond the existing cleanup so tests remain independent.

## Cover the affected workflow

- Lists: search/filter/page changes, displayed rows/counts, loading, empty, error, and implemented retry states.
- Forms: accessible labels, input/validation, pending-save behavior, successful server values, retained input on rejection, and actionable conflict recovery.
- Mutations: refreshed affected views and reports after success, with no false success state after failure. Request call counts alone are insufficient.
- Reports: correct requirement fixtures, units/currency/basis labels, filter state, and empty/error behavior.
- Shared primitives: naming, disabled interaction, keyboard/focus behavior where relevant, and default/explicit form submission semantics.

Choose cases relevant to the change; do not exhaustively retest unrelated components. Include a meaningful rejection path for changed mutation flows alongside success.

## Verify at the right layer

Simulated DOM tests cannot prove actual layout, browser hydration, complete routing, or backend integration. Use an available browser workflow separately when those behaviors are affected; do not claim a component test establishes end-to-end correctness or install browser tooling without need.

Run affected frontend/component-library tests and typechecks, then repository lint/format checks. Report actual results, what was verified, and remaining limitations.
