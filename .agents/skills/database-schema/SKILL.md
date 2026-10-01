---
name: database-schema
description: "Change PostgreSQL tables, migrations, reference (master) data, or the employee seed in packages/domain. Use for schema, migration, lookup-data, or seed changes; read backend-tests for the matching tests."
---

# Database Schema

Use this guide when changing tables, constraints, indexes, migrations, reference data, or seed generation. The package README holds commands and setup; [design decisions](../../../docs/decisions.md) holds the reasoning. Record new trade-offs there.

## Where things live

- `packages/domain` is server-only and owns the schema, Drizzle-inferred types, connections, migrations, and the seed. API request/response shapes stay in `packages/contracts`; never export Drizzle types through contracts or common.
- One table per file in `src/schema/` using kebab-case names (`salary-changes.ts`), with its inferred types (`Employee`, `NewEmployee`) in the same file. Export every table from `src/schema/index.ts`. Shared column helpers and limits live in `src/schema/columns.ts`.
- Put Drizzle `relations()` in a separate `relations.ts` if they are introduced, so table files do not import each other in cycles.

## Modelling rules

- **Keys:** use the standard code as the primary key when one exists and is stable (ISO 3166 countries, ISO 4217 currencies). Use a surrogate `uuid` for organization-owned data whose names can change (departments, job titles, employees) and keep the name `unique`.
- **Money:** integer minor units in `bigint` number mode, constrained to `1..MAX_SALARY_MINOR_UNITS`. Never floats. Currency precision comes from `currencies.minor_units`. Store the currency explicitly beside every amount; never infer it from country.
- **Rates and other exact decimals:** `numeric`, read as strings; do not convert to floats for storage.
- **Integrity in the database:** add check constraints, foreign keys, and unique constraints for invariants rather than relying only on application validation. Name constraints `<table>_<rule>_valid` / `_unique` / `_idx`.
- **Writes:** salary changes update `version` (optimistic lock) and `updatedAt` explicitly, and insert a `salary_changes` row in the same transaction. There are no triggers. Employees are deactivated, not deleted.

## Migrations

1. Edit the table file, then run `pnpm db:generate`. Review the generated SQL and commit it with `migrations/meta` and the schema change.
2. Never edit an applied migration or use schema push. Data changes and backfills go in new, reviewed custom SQL migrations.
3. For refactors that should not change the database (moving tables, renaming helpers), run `pnpm --filter @salary-manager/domain exec drizzle-kit generate` and confirm it reports no schema changes.
4. Migrations run only through `db:migrate` (or `db:reset` locally), never on API startup.

## Reference data and seed

- Reference data (currencies, countries, departments, job titles, FX rates) is installed by SQL migrations with fixed IDs. Change it with a new migration.
- Never copy reference-data IDs into TypeScript. Code and seeds refer to departments and job titles by name and resolve IDs from the database, failing clearly if a name is missing.
- The seed only inserts employees, in one transaction, into empty tables. It must stay deterministic: fixed seed, no `Date.now()` or unseeded randomness, and Faker pinned to an exact version and driven by its own seeded stream so upgrades change names, never pay.
- When the schema gains a required employee column, update the generator and its property tests in the same change.

## Verify

Run `pnpm --filter @salary-manager/domain test`, `pnpm test:db`, `pnpm typecheck`, and `pnpm biome`. Add integration tests for new constraints, transactions, or lookups (see backend-tests). `db:reset` only targets the local Compose database on port 55432; never point it, or tests, at a shared database.
