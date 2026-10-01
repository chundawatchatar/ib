# Design decisions

Short records of the choices behind the salary manager and what they cost.
Product scope lives in [requirements](requirements.md).

## PostgreSQL with Drizzle and committed SQL migrations

**Decision:** PostgreSQL 17 via Docker Compose locally; Drizzle for typed queries;
schema changes as generated, reviewed SQL migrations applied by `db:migrate`.

**Why:** Real transactions, row locks, `numeric`, and percentile functions cover
the salary-edit and pay-insight requirements without extra infrastructure. Typed
queries come from the same schema that generates migrations.

**Trade-off:** Heavier than SQLite to deploy; needs a hosted database.

## Migrations run explicitly, never on API startup


**Why:** Several API instances racing to migrate, or a bad migration blocking every
restart, are avoidable failure modes. Startup only checks connectivity.

**Trade-off:** Deployment has one extra step.

## Money as integer minor units

**Decision:** Salaries are `bigint` minor units (cents; yen for JPY), limited to
JavaScript's safe-integer range by a check constraint. Each currency's precision
is stored in `currencies.minor_units`.

**Why:** No floating-point rounding in storage or sums; exact equality in tests.

**Trade-off:** Formatting and input parsing must convert using currency precision.

## Explicit salary currency, dated FX rates

**Decision:** Every employee stores its salary currency; a country's default
currency is only a suggestion and may be absent. FX rates are exact `numeric`
values keyed by currency pair and date.

**Why:** People can be paid in a currency other than their country's. Reports
must state their conversion basis ("USD @ rate date") and never silently combine
currencies. Static rates keep tests deterministic.

**Trade-off:** No live rates; adding a rate date is a migration.

## Reference data installed by migrations

**Decision:** Currencies, countries, departments, job titles, and FX rates are
inserted by reviewed SQL migrations with fixed IDs.

**Why:** Every environment gets identical reference data, versioned with the
schema that depends on it.

**Trade-off:** Adding a department needs a migration until an admin UI exists
(out of scope).

## Shared job titles and free-text levels

**Decision:** Job titles are independent of departments (an Analyst can sit in
Engineering or Finance); level is text (L1–L6).

**Why:** Matches how organizations reuse titles and lets pay be compared by title
across departments. Level formats vary between organizations.

## Optimistic locking and an audit row per salary change

**Decision:** Employees carry a `version`. A salary edit updates the row only if
the version still matches, and writes a `salary_changes` row (old/new amount and
currency, new version, optional reason) in the same transaction. Audit rows block
employee deletion; employees are deactivated instead.

**Why:** Two HR users editing the same record must not silently overwrite each
other, and every change must be traceable.

**Trade-off:** Clients must send the version they read and handle conflicts.

## Deterministic seed generator instead of committed data

**Decision:** `db:seed` generates 10,000 employees from a fixed random seed, with
pay derived from country, level, and department.

**Why:** The brief asks for a seed script. A short generator is reviewable,
easy to change when the schema changes, and gives identical data on every run.
Structured pay makes the insight screens meaningful. An earlier draft
used a 2 MB hand-built TSV, which could not be reviewed in diffs and had no record
of how it was produced.

Names come from Faker with one locale per country (Japanese names in kanji,
family name first), drawn from a separate random stream so a Faker upgrade can
change names but never pay. Faker is pinned to an exact version because its
seeded output is not guaranteed across releases. About 99% of names are unique,
which keeps directory search meaningful.

**Trade-off:** Changing the generator changes the data; tests assert properties
(counts, ranges, level ordering, name uniqueness) rather than exact rows.

## Local-only database reset

**Decision:** `db:reset` drops and recreates only the Compose database
(`salary_manager` on localhost:55432); deployed databases use `db:migrate`.

**Why:** A reset command pointed at the wrong URL is destructive and irreversible.

## API app factory and feature modules

**Decision:** Build Express applications with `createApp({ services, logger })`;
keep middleware assembly in the app factory, typed ts-rest controller registration
in the router, and controller/service/query files together under feature modules.
Startup owns the PostgreSQL connection and listener. Services own business rules
and transaction boundaries; queries own Drizzle persistence when features need it.

**Why:** Upcoming directory, salary-edit, and reporting features need clear
ownership and injectable dependencies for HTTP tests. Contract validation stays
in ts-rest, while shared middleware supplies request IDs, structured logging,
bounded JSON parsing, and consistent error responses.

**Trade-off:** The health endpoint is simple enough to fit in one file, but now
establishes the module convention. Avoid generic base controllers or repositories;
add query files and database dependencies when a feature actually uses them.

## Employee profile edits keep compensation separate

**Decision:** Create accepts the initial salary and explicit currency. Profile
updates replace the profile fields and require the current version; salary and
currency changes go through the salary-edit API. Deactivation also requires
a version, retains employee/audit rows, and is a no-op when already inactive at
that version. These operations share one employee service and query module.

**Why:** A profile-edit path must not bypass salary audit requirements. Row locks
and version checks keep profile edits, deactivation, and future salary changes
from overwriting each other. Validated references are held with key-share locks
until the transaction commits, and duplicate-code updates roll back fully.

**Trade-off:** Clients must send the complete profile and version, and reload on
conflicts. Initial salary creation is not a salary change; profile edits do not
produce salary audit entries. Salary edits write their audit entries atomically.

## Salary saves serialize with all employee writes

**Decision:** Salary edits lock the employee before checking the expected version,
then update compensation and write the audit row in one transaction. The audit
uses the resulting employee version and update timestamp. Every accepted save,
including unchanged compensation, creates an audit entry; inactive employees can
be edited consistently with profile edits.

**Why:** One shared version protects salary edits against concurrent salary,
profile, and deactivation writes. A failed audit insert must undo the salary
update, and retrying an old request must never create a second history row.

**Trade-off:** Contending writes briefly wait for the row lock before returning
a conflict. Clients must reload after 409 and send the new version for a new save.

## Exact pay summaries and explicit report populations

**Decision:** Insights reuse directory population filters but default to active
employees. Local reports separate currencies; USD reports use the latest installed
USD rate date and require rates only for non-USD currencies in the filtered
population. USD converts at exactly 1 without a stored rate, so USD→USD rows never
choose the rate date or cause a missing-rate error.
Missing required rates return 422 because repairing master data is necessary;
retrying cannot fix the report. Rates never fall back to an earlier date.

Salary conversion uses numeric decimal scale factors and exact multiplication,
retaining fractional USD minor units through aggregation. Median and quartiles
number ordered rows and interpolate numeric neighbors at rank `1 + (n-1)*p`;
`percentile_cont` is avoided because it uses double precision. Each final monetary
statistic is rounded once to an integer minor unit, half up, and serialized as a
decimal string. Sums can exceed JavaScript's safe integer range.

**Why:** Reports must reflect the complete population without silently mixing
currencies, losing large-value precision, or rounding each employee's conversion.

**Trade-off:** Clients need string-money formatting, planned as a shared common
helper with the insights UI. Empty local reports have no currency summaries;
empty USD reports have one USD summary with zero total/count and null statistics.
