# Client

React application built with TanStack Start, TanStack Router, Vite, and Tailwind CSS.

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
- `src/components/`: React components and their colocated tests.
- `src/test/setup.ts`: shared Vitest DOM setup and cleanup.
- `src/styles.css`: Tailwind imports and visual styles.
- `tsconfig.json`: extends the repository's strict TypeScript settings and adds browser/bundler options.
- `vitest.config.ts`: component tests in jsdom, separate from the Start build plugins.

Use the root Biome configuration for formatting and linting. Format with `pnpm run format`; apply safe lint fixes with `pnpm run lint:fix`.

## Routes and contracts

Create routes in `src/routes/`. The TanStack Start Vite plugin generates `src/routeTree.gen.ts`, including the Start `Register` block, whenever `dev` or a Vite build runs. `typecheck` and `build` regenerate it first, so `pnpm check` is always current; `generate-routes` runs that step on its own. Do not use the bare `tsr generate` CLI: it does not know about Start and drops the `Register` block.

Do not manually edit the generated route tree. Share ts-rest API contracts through `packages/` as endpoints are introduced, following `AGENTS.md`.
