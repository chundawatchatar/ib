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


## Grouped pay and readable salary distributions

**Decision:** Group one dimension at a time (country, department, level, or job
title), using stable codes/IDs and master-data labels. Local groups retain
per-currency summaries. Levels use English numeric ordering, so L2 precedes L10.
The populated-group response bound is 1,000,000, independent of seed size; the
service checks cardinality first and returns 422 rather than truncating or
failing response validation.

Histograms describe the whole filtered population, separately per currency in
local mode and together in USD mode. Choose the smallest 1, 2, or 5 × 10ⁿ
major-unit width at least the population range divided by 10, and align the outer
edges to multiples of that width. The resulting histogram has at most 11 bands.
Numeric `width_bucket` assigns unrounded salaries; the last band includes its
upper edge. Exact boundaries can contain fractional minor units. Contract schema
notes specify boundary, constant-population, and empty-result behavior.

**Why:** Round bands are easier to read than arbitrary min/max edges. SQL numeric
arithmetic preserves FX fractions and avoids float-based logarithms and bucket
assignment. A shared window-and-aggregate calculation selects percentile
neighbors without joining the ordered population to itself, keeping grouped and
whole-population summaries practical over 10,000 employees.

**Trade-off:** Band counts vary, and an extreme outlier still compresses the bulk
of salaries into a few bands. Filters change the bands; comparing two histograms
requires reading their boundaries. This version does not add logarithmic scales,
outlier clipping, fixed cross-report bands, or per-group histograms.


Local performance sample (2026-10-01): macOS 26.6.2 arm64, Node 26.8.1,
pnpm 11.15.1, PostgreSQL 17 in the local Compose container. The reports integration
test installed real migrations and the deterministic 10,000-employee seed in a
fresh test database. Timings measure loopback HTTP through parsed response JSON,
one request per case, excluding migration and seed setup; no timing assertions.

| Report | Local view | USD view |
| --- | ---: | ---: |
| Country groups | 53 ms | 29 ms |
| Department groups | 28 ms | 31 ms |
| Level groups | 28 ms | 27 ms |
| Job-title groups | 26 ms | 30 ms |
| Histogram | 11 ms | 14 ms |

Directory requests with page size 1 took 9 ms without search, 16 ms for `EMP`,
13 ms for `Alex`, and 14 ms for a nonexistent name. All four sampled cases were
below the local 500 ms requirement. These are local samples, not a deployed or
concurrent-load guarantee. Reproduce with the reports integration test's
`reports the full seed` case and Vitest `--silent=false --reporter=verbose`.

## Client-rendered single-page app

**Decision:** Run TanStack Start in SPA mode. The build prerenders only the HTML
shell; routes, loaders, and queries run in the browser. The client calls `/api`
on its own origin, proxied to the API by the Vite dev and preview servers.

**Why:** An internal HR tool behind a login gains nothing from server rendering
or SEO. Client-only rendering removes per-request query caches, cache
hydration, and a separate server-side API URL.

**Trade-off:** First paint waits for the JavaScript bundle and the first API
calls, covered by skeletons. Deployment must serve `/api` on the client's origin
(reverse proxy) or the API must allow cross-origin requests.

## Deployment: Render static site and API, Neon PostgreSQL

**Decision:** Deploy the client as a Render static site and the API as a Render
Docker web service (`render.yaml`), with PostgreSQL on Neon. The static site
rewrites `/api/*` to the API, so the browser keeps calling its own origin and
the API needs no CORS. Migrations and the seed run from the manual "Database"
GitHub Actions workflow. Steps are in [deployment](deployment.md).

**Why:** Reviewers must be able to open the app for weeks at no cost. Neon's
free database does not expire, unlike Render's free PostgreSQL. Keeping client
and API as separate services lets each deploy and scale on its own, and the
API image holds only the self-contained bundle. A manual workflow runs
migrations explicitly with the database secret kept in GitHub, not on a laptop.

**Trade-off:** Free Render services sleep when idle, so the first request after
a pause can take close to a minute. The API URL is fixed in the static site's
rewrite rule. The proxy adds a hop to every API request.
