# Client

Client-rendered React application (TanStack Start in SPA mode) built with TanStack Router, Vite, and Tailwind CSS.

## Workspace commands

Run these commands from the repository root. Dependencies use the root pnpm workspace and shared lockfile.

```sh
pnpm install
pnpm run dev
pnpm run build
pnpm run typecheck
pnpm run test
pnpm run biome
```

The development server runs on port 3000. To target only this app, use `pnpm --filter @salary-manager/client run <script>`. Run `test:watch` for interactive Vitest testing, and `preview` to preview the production build.

## Source and configuration

- `src/routes/`: file-based routes, including the shared document shell in `__root.tsx`.
- `src/components/`: app shell (header, theme toggle, route pending/error states).
- `src/features/<feature>/`: `api.ts` query factories and mutation hooks, plus the feature's components and tests.
- `src/lib/api.ts`: the ts-rest `apiClient` built from the shared contract, `unwrap`, and the `ApiError` it throws.
- `src/lib/query-client.ts`: TanStack Query defaults (30 s `staleTime`, no retries for 4xx errors or mutations).
- `src/test/setup.ts`: shared Vitest DOM setup, browser API stubs, and cleanup.
- `src/test/render-app.tsx`: `renderApp(path, handler)` renders the real route tree with a fresh query cache and answers `fetch` from contract-shaped fixtures in `src/test/fixtures.ts`.
- `src/styles.css`: Tailwind imports and visual styles.
- `tsconfig.json`: extends the repository's strict TypeScript settings and adds browser/bundler options.
- `vitest.config.ts`: component tests in jsdom, separate from the Start build plugins.

Use the root Biome configuration for formatting and linting. Format with `pnpm run format`; apply safe lint fixes with `pnpm run lint:fix`.

## Routes and contracts

Create routes in `src/routes/`. The TanStack Start Vite plugin generates `src/routeTree.gen.ts`, including the Start `Register` block, whenever `dev` or a Vite build runs. `typecheck` and `build` regenerate it first, so `pnpm check` is always current; `generate-routes` runs that step on its own. Do not use the bare `tsr generate` CLI: it does not know about Start and drops the `Register` block.

Do not manually edit the generated route tree. Share ts-rest API contracts through `packages/` as endpoints are introduced, following `AGENTS.md`.

## Data access

Server data goes through TanStack Query with the ts-rest `apiClient`; components never call `fetch`. Feature `api.ts` files define `queryOptions` factories and mutation hooks, and pass each response through `unwrap(response, 200)`, which returns the typed body or throws an `ApiError` (`status`, with 409 for stale edits, and field-level `issues`).

The app renders only in the browser: Start runs in SPA mode and prerenders just the HTML shell, so loaders and queries never run on a server. `getRouter` creates the `QueryClient`, provides it to components, and puts it on the router context; route loaders prefetch with `context.queryClient.ensureQueryData(...)`.

The browser calls `/api` on its own origin; the Vite dev and preview servers proxy it to `API_URL` (default `http://localhost:3001`). A deployment must serve or proxy `/api` on the client's origin the same way.
