# Deployment

How the app is deployed and what contributors must keep in mind so changes
deploy cleanly. Reasoning is in
[decisions](decisions.md#deployment-render-static-site-and-api-neon-postgresql).

## How it runs

| Part | Where | Defined in |
| --- | --- | --- |
| Client | Render static site serving `apps/client/dist/client` | `render.yaml` |
| API | Render Docker web service running the esbuild bundle | `Dockerfile`, `render.yaml` |
| PostgreSQL | Neon | `DATABASE_URL` secret |
| Migrations and seed | Manual **Database** GitHub Actions workflow | `.github/workflows/database.yml` |

The browser only talks to the static site. It rewrites `/api/*` to the API and
every other path to the SPA shell (`_shell.html`), matching the Vite dev proxy.
Pushes to `main` redeploy both services after CI.

## When your change affects deployment

- **Migrations.** The API never migrates on startup. After merging a migration,
  run the **Database** workflow with `migrate`. Keep migrations compatible with
  the running API until it redeploys, because the two steps are not atomic.
- **API routes.** Keep every endpoint under `/api` (see `ROUTE` in
  `packages/common`); the static site only forwards that prefix.
- **Client routes.** Use extensionless paths; any unknown path loads the shell.
- **Environment variables.** Add new ones to `.env.example` and to the service's
  `envVars` in `render.yaml` (`sync: false` for secrets). The API reads `PORT`
  (default 3001) and `DATABASE_URL`.
- **API dependencies.** The image contains only `apps/api/dist`, so the bundle
  must stay self-contained. A dependency esbuild cannot bundle fails at runtime,
  not at build time.
- **Build commands.** The static site build in `render.yaml` and the
  `Dockerfile` use filtered installs; a new workspace dependency is picked up
  automatically through `--filter <package>...`.

## Check the API image locally

```sh
docker build -t salary-manager-api .
docker run --rm -p 127.0.0.1:3101:3001 \
  -e DATABASE_URL=postgresql://salary_manager:local-development-only@host.docker.internal:55432/salary_manager \
  salary-manager-api
curl localhost:3101/api/health
```

Run `pnpm db:up` and `pnpm db:migrate` first.

## Setting up a new environment

1. Create a Neon project (PostgreSQL 17) and copy its connection string.
2. In GitHub, add a `production` environment with a `DATABASE_URL` secret, then
   run the **Database** workflow with `migrate` and then `seed`. The seed
   refuses to run when employees already exist.
3. In Render, choose **New → Blueprint**, select the repository, and enter the
   same `DATABASE_URL` for the API.
4. If the API's URL differs from `https://salary-manager-api-o39t.onrender.com`,
   update the `/api/*` rewrite in `render.yaml`.
5. Open `/api/health` on the static site, then the directory and insights pages.

## Free-tier behavior

The API sleeps after 15 idle minutes; the next request can take about a minute
while it starts. The client shows skeletons meanwhile.
