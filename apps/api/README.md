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

## Server architecture

`src/app.ts` exports `createApp({ services, logger })`. It assembles middleware and
the typed router without opening a socket or database connection. Startup supplies
services constructed with the connected database; the logger has a production
default. HTTP tests supply service doubles, and each call returns a fresh
application. `src/start.ts` owns PostgreSQL connectivity, the listener, and graceful
shutdown. `src/index.ts` is the executable entry point and signal handler.

API contracts are split by feature in `packages/contracts/src/`.
`<feature>.contract.ts` declares routes using the schemas and inferred types in
`<feature>.ts`. Each feature contract uses `contract-options.ts` for shared error
responses. `index.ts` exports and composes feature contracts into the main
`contract`, keeping route names flat. Add routes to the owning feature contract;
register new feature contracts in the main composition.

Feature code lives together under `src/modules/<feature>/`:

- `<feature>.controller.ts` translates validated contract inputs and service
  results into HTTP status/body pairs. Controllers use ts-rest handler types.
- `<feature>.service.ts` owns application behavior and transaction boundaries.
- Add `<feature>.queries.ts` when database-backed behavior arrives; it owns
  parameterized Drizzle queries. Persistence entities remain in the server-only
  domain package. Queries select explicit contract fields rather than exposing
  persistence rows.

`src/services.ts` constructs services and defines the injectable service bundle;
`src/router.ts` connects controllers to the shared ts-rest contract. Startup
passes its connected database to the service factory; services receive the
dependencies they use. There is no shared base controller or generic repository
layer.

Middleware runs in this order: request context, JSON parser, contract endpoints,
JSON 404 fallback, centralized error handler. Request context returns an
`x-request-id` (accepting only 1–100 ASCII letters, digits, underscores, or
hyphens from the caller), sets `nosniff`, and logs method, status, elapsed time,
and request ID. Logs omit URLs, query strings, bodies, and raw errors. Express's
`x-powered-by` header is disabled. JSON bodies are limited to 64 KiB.

Contract validation stays in ts-rest with response validation enabled. Shared
error responses use `{ message, issues? }`. Request validation failures return 400
with `issues` (`location`, dot-separated `path`, `message`) so clients can show
field errors; malformed JSON returns 400, oversized bodies 413, and unsupported
charsets or encodings 415. Other client errors that carry an exposed 4xx status
keep it with a generic message. Only unexpected failures return a generic 500
and are logged as `request.failed`.
Unknown routes return a JSON 404. Controllers let unexpected failures propagate
to the centralized handler. Future endpoints declare expected domain errors
(such as 404 or stale-edit 409) in their contracts and map them in controllers.

## Adding a feature

1. Define route constants in `packages/common/src/routes.ts` and schemas, inferred
   types, and routes in the feature's contract files. Compose the feature contract
   in `packages/contracts/src/index.ts`.
2. Implement the controller, service, and queries under `src/modules/<feature>/`.
   Keep HTTP mapping in controllers and business rules and transactions in services.
3. Construct the service in `src/services.ts`, register controllers in
   `src/router.ts`, and add defaults to `src/test-services.ts` for unrelated tests.
4. The contracts in `packages/contracts/src/*.contract.ts` are the endpoint
   reference; do not document endpoints in Markdown. Explain non-obvious fields
   with Zod `.describe()`, comment non-obvious behavior where it is implemented,
   and record the reasoning behind real trade-offs in `docs/decisions.md`.
5. Add HTTP and persistence coverage alongside the feature, then run the checks
   below. Follow the repository's local API and backend-test skills.

## Verification

Run `pnpm check` from the repository root for formatting, lint, typechecks, and
unit/HTTP tests. HTTP tests use injected services and ephemeral loopback ports;
they do not require PostgreSQL.

Run `pnpm test:db` for both domain and API PostgreSQL integration tests. The tests
create and drop uniquely named databases using `TEST_DATABASE_URL`, apply real
migrations, and leave the development database untouched.

Keep database tests in `*.integration.test.ts` and ordinary tests in `*.test.ts`.
Run `pnpm --filter @salary-manager/api build` to verify the production bundle when
changing imports, contract composition, or startup.
