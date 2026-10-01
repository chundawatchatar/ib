---
name: frontend-development
description: "Build client features and shared UI components: shadcn/ui + Tailwind components in packages/ui, typed data access with ts-rest and TanStack Query (queryOptions factories, mutation hooks), React Hook Form forms, search, loading states, and React patterns. Use for any change in apps/client or packages/ui."
---

# Frontend Development

Use this guide for screens, components, data fetching, and forms. Read [frontend-design](../frontend-design/SKILL.md) for visual direction and [frontend-tests](../frontend-tests/SKILL.md) for how to test. API shapes come from `packages/contracts`; see [api-endpoints](../api-endpoints/SKILL.md).

## Components come from `@salary-manager/ui`

- `packages/ui` owns every reusable visual component, built with shadcn/ui and Tailwind (Radix primitives, `class-variance-authority` variants, a `cn()` helper). Add shadcn components there, never in the client.
- The client composes these components and does not restyle them. Pass only layout classes (width, margin, grid/flex placement). Colors, spacing inside the component, typography, borders, and states belong in the component's variants.
- Need a new look or behavior? Add a variant or prop in `packages/ui`, with a test, and export it from `src/index.ts`. Do not fork a copy into the client or override it with `className`.
- Theme through the design tokens (CSS variables) in the UI stylesheet, not hard-coded colors.
- Feature-specific compositions (an employee table row, a salary form built with React Hook Form) live in the client; generic building blocks (Table, Skeleton, Dialog, SearchInput) live in `packages/ui`.

## Data: ts-rest contract + TanStack Query

Components never call `fetch` or the API client directly. All server data goes through TanStack Query using the ts-rest client created from the shared `contract`; request and response types come from the contract, never hand-written. Each feature keeps this in `features/<feature>/api.ts`.

- **Queries use `queryOptions` factories.** One factory per resource holds the hierarchical key and the fetch function together (`employeeQueries.list(filters)`, `employeeQueries.detail(id)`, `employeeQueries.all()`). Include every parameter that changes the result in the key. Use the factory directly: `useQuery(employeeQueries.list(filters))` in components, and `queryClient.ensureQueryData(...)` in route loaders so data starts loading before render.
- **Do not wrap a single `useQuery` in a custom hook.** Add a query hook only when it adds logic, such as combining queries or building options from route search params.
- **Mutations are custom hooks** (`useUpdateSalary`) that own the request and the cache refresh. On success, invalidate every affected query (employees and insights) and return that promise so the mutation stays pending until fresh data arrives. Do not hand-patch caches unless an optimistic update is required.
- **Unwrap responses in one helper.** ts-rest returns `{ status, body }`; a shared `unwrap` returns the body for the expected status and throws a typed `ApiError` otherwise, so Query's `error` state works. A `409` stale-edit conflict must stay distinguishable.
- **Client defaults:** a `staleTime` above zero (about 30 s) and no retries for 4xx errors.
- Keep list results while new filters load (`placeholderData: keepPreviousData`) so tables do not flash empty. Never copy query data into `useState`; reshape it with `select`. Query holds server data only, not UI state.
- Keep filters, search, sort, and page in the URL with TanStack Router's validated search params, so views are shareable and survive refresh. Derive query inputs from them.

## Search

- Use the shared `SearchInput` from `packages/ui` (`<input type="search">` with a built-in debounce, about 300 ms, exposing `onDebouncedChange`). Do not debounce in feature code.
- The input stays responsive on every keystroke; only the debounced value updates the URL and query. Clearing the field searches immediately.

## Loading, empty, and error states

- First load: render `Skeleton` placeholders shaped like the final content (rows, cards, chart area) so the layout does not shift. No full-page spinners.
- Refetching with data on screen: keep the data visible and show a subtle pending indicator.
- Empty: explain why (no employees vs. no matches for these filters) and offer the next action (clear filters).
- Error: a short message with a retry action. Never show raw server errors.
- Mutations: disable the submit control while pending, keep the user's input after a failure, and show conflicts with a way to reload the latest values.

## React patterns

- Avoid `useEffect`. Do not use it to fetch data (use Query), compute derived values (compute during render), react to user actions (handle them in the event handler), or copy props into state (derive them, or reset with a `key`). Use it only to sync with something outside React, such as a timer, subscription, or DOM API, and always clean up.
- Keep components small and typed; no `any`. Route files stay thin: validate search params, prefetch in the loader, compose components.
- Format money from integer minor units with `Intl.NumberFormat` using the currency's precision. Never do arithmetic on formatted strings or floats for totals; totals come from the API.

## Forms: React Hook Form

- Build every form with React Hook Form and `zodResolver`, using the request schema from `packages/contracts` (or one derived from it with `.pick`/`.extend`). Never duplicate validation rules by hand; the server remains the authority.
- Use the `@salary-manager/ui` controls. Native ones (Input, Textarea, Select, Checkbox) work with `register`; wrap any non-native control in `Controller`.
- Pair each control with a `Label` (`htmlFor`/`id`). Show field errors below the control, set `aria-invalid`, and link the message with `aria-describedby`.
- Load server data into the form with the `values` option (or `reset` after a successful save), not with `useEffect`. Convert money between display units and integer minor units at the form boundary.
- Submit through a mutation hook. Disable the submit button while the mutation is pending. On failure the form keeps the user's input: map field errors from the API onto fields with `setError`, and show a `409` conflict with an action to load the latest values (which resets the form, including the new `version`).

## Structure and tests

```
apps/client/src/
  routes/                 # thin route files
  features/<feature>/
    api.ts                # queryOptions factories + mutation hooks
    EmployeeTable.tsx
    EmployeeTable.test.tsx
packages/ui/src/components/
  SearchInput.tsx
  SearchInput.test.tsx
```

- Keep each test next to the file it tests (`Component.test.tsx`). Shared component tests stay in `packages/ui`; feature tests stay in the client.
- Test queries and mutation hooks through the components that use them. Mock at the network boundary with contract-shaped fixtures, and give each test a fresh `QueryClient` with retries off.

## Verify

Run `pnpm check`; the client typecheck regenerates the route tree through the Start Vite plugin. Never run the bare `tsr generate` CLI, which drops the Start `Register` block. Check new screens in the browser for loading, empty, error, and keyboard behavior; DOM tests cannot prove layout.
