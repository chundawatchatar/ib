# Database layer

`@salary-manager/domain` is server-only. It owns the PostgreSQL schema
(`src/schema/`, one file per table), Drizzle-inferred types, connections,
migrations, and the employee seed script. Applications import `createDatabase(databaseUrl)` and the
tables/types from its entry point. HTTP contracts stay in `packages/contracts`.
The reasoning behind the data model is in [design decisions](../../docs/decisions.md).

## Local setup

Requires Node.js 22.9+, the pinned pnpm version, and Docker. From the root:

```sh
cp .env.example .env
pnpm install
pnpm db:up     # start PostgreSQL 17 (Compose, localhost only)
pnpm db:reset  # recreate the local database and apply migrations
pnpm db:seed   # add 10,000 deterministic fictional employees
pnpm dev
```

Scripts read the root `.env`; exported environment variables take precedence.
The example credentials are for local development only.

## Commands

| Command | What it does |
| --- | --- |
| `db:up` / `db:down` | Start or stop the Compose database. `db:down` keeps the data volume. |
| `db:migrate` | Apply outstanding migrations to `DATABASE_URL`. Safe to re-run. |
| `db:reset` | Drop and recreate the **local Compose** database, then migrate. Refuses any other target. Stop the API first. |
| `db:seed` | Insert generated employees in one transaction. Fails if employees already exist; reset first to reseed. |
| `db:generate` | Generate a migration from `src/schema/` for review. |

## Rules for changing the schema

1. Edit the table's file in `src/schema/` (export new tables from its
   `index.ts`), run `pnpm db:generate`, then review and commit the SQL and
   `migrations/meta` together with the schema change.
2. Never edit an applied migration or use schema push; add a new migration.
3. Reference data (currencies, countries, departments, job titles, FX rates) is
   installed by reviewed SQL migrations. Change it with a new migration. The
   seed script only inserts employees.
4. The seed refers to departments and job titles by name and resolves their IDs
   from the database, so IDs live only in the migration. Seeding fails with a
   clear error, inserting nothing, if a name is missing from master data.
5. Write workflows must set `updatedAt` and increment `version` themselves;
   there are no database triggers.

## Deployment

Run `pnpm db:migrate` with the deployed `DATABASE_URL` before starting the API.
Migrations are not bundled into the API artifact, and the API never migrates on
startup; it only verifies connectivity.

## Tests

```sh
pnpm --filter @salary-manager/domain test  # fast unit tests, no database
pnpm test:db                               # real PostgreSQL integration tests
```

`test:db` needs `TEST_DATABASE_URL` (see `.env.example`) for a role with
`CREATEDB`. Each test uses a uniquely named temporary database with real
migrations, and drops it afterwards; the development database is untouched.
