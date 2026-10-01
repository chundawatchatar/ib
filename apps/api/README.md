# API development

First copy `.env.example` to `.env`, then run `pnpm db:up`,
`pnpm db:migrate`, and optionally `pnpm db:seed`. See the
[database setup guide](../../packages/domain/README.md) for reset and seed details.
The API requires `DATABASE_URL`, verifies connectivity before listening, and
closes its database pool on shutdown. Migrations run separately from startup.

From the repository root, run `pnpm dev:api` to start the API on port 3001,
or `pnpm dev` to start both the API and client.

Shared packages export their TypeScript source directly. The API development
runner loads contracts, common utilities, and domain entities from source.
Saving API source or a file in `packages/*/src` automatically restarts the API.
No separate shared-package build or compiler watcher is needed to run the API.

For production, run `pnpm --filter @salary-manager/api build`, then
`pnpm --filter @salary-manager/api start`. The build checks types and uses esbuild to
bundle the API, shared packages, and JavaScript dependencies into
`apps/api/dist/index.cjs`, with a source map alongside it.

Deploy the API's `dist` directory to a Node.js 22 or newer runtime. The current
API bundle runs without workspace source files or `node_modules`.

Run `pnpm build` to build all applications. The Vite client bundles its imported
shared source through its own build pipeline. Shared package build scripts only
check types; they do not emit separate JavaScript artifacts.

Run `pnpm typecheck` to check source directly without building shared packages.

Development and start scripts read the root `.env` when present; exported
environment variables take precedence. A deployed bundle receives `DATABASE_URL`
through its environment. PostgreSQL must be reachable before starting the API.
