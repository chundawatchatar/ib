# ACME Salary Manager: Requirements (1 page)

## Goal and user
Give ACME's **HR Manager** a web app to maintain salary records for ~10,000 employees across countries and **answer "how do we pay people?"** without consolidating spreadsheets.
**Success:** find an employee and update their salary in under 30 seconds; compare pay across countries, departments, and levels without exporting anything.

## Assumptions (stated, not open questions; revisit if wrong)
- Salary = **annual gross base salary**, stored in the employee's **local currency** (integer minor units, no floats).
- One organization, one HR role, synthetic data, current compensation only.
- Reporting currency is **USD**, via a **static, dated FX table**. Every report states its basis ("local currency" or "USD @ rate date"). **Currencies are never silently combined.**

## Scope: what we are building
**1. Employee and salary management**
- Server-paginated directory (10k rows) with name/code search, filters (country, department, level, currency, salary range), stable sorting, and total match count.
- Create, view, edit, and deactivate employees. Deactivated employees are excluded from reports by default.
- Edit salary with server-side validation (positive amount, valid currency/country), **atomic save**, **stale-edit protection** (optimistic locking via version; conflicts rejected), and inputs retained on error.
- **Salary change log** (old, new, timestamp), written in the same transaction as the change.

**2. Pay insights (core differentiator)**
- For the **full filtered population** (not just the visible page): headcount, total, average, **median**, min, max, P25/P75.
- Group-by country, department, level, or job title, plus a **salary distribution** histogram.
- Toggle between **local currency** (grouped per currency) and **USD-normalized** views.
- Reports refresh immediately after a save.

**3. Quality**
- Loading, empty, and error states; accessible controls; durable storage (data survives restart).
- Deterministic seed script (`db:seed`, fixed random seed) for 10,000 employees across 10 countries, with realistic pay by country, level, and department. Master data (currencies, countries, departments, job titles, FX rates) is installed by migrations; the seed only adds employees, atomically, into empty tables, and a repeat seed fails without changes. Fast unit tests on core logic.

## Deliberately left out (and why)
| Excluded | Reason |
|---|---|
| Payroll, tax, benefits, bonus, equity, payslips | Country-specific rules; a different product. Base salary answers the stated problem; schema stays extensible |
| Auth, SSO, roles | Single persona in the brief. Essential in production (sensitive data), so first follow-up; API is structured for auth middleware |
| Excel import/export | Seed script covers data for this exercise; real migration needs a validated import flow |
| Live FX rates | Static rates keep tests deterministic and avoid an external dependency; isolated behind one module |
| Full effective-dated history, scheduled changes, approvals | Change log gives traceability at a fraction of the complexity |
| Multi-org, self-service, natural-language queries | No stated need; filters and group-by cover the questions asked |

## Acceptance (fixture: USD 100,000; USD 150,000; EUR 90,000; assumed EUR→USD 1.10)
- **Local view:** USD group = count 2, total 250,000, avg 125,000, range 100,000–150,000. EUR group = count 1, 90,000, reported separately.
- **USD-normalized view:** count 3, total 349,000, avg 116,333.33, median 100,000.
- **After editing USD 150,000 → 160,000:** USD group total 260,000, avg 130,000. Normalized total 359,000, avg 119,666.67, median 100,000. EUR group and counts unchanged.
- **Filters/counts** cover all matching records across pages; directory search over 10,000 records responds in under 500 ms locally.
- **Failure safety:** an invalid or conflicting (stale) edit leaves data unchanged; a successful edit survives restart; a change-log row exists for every successful edit.

## Database foundation
- PostgreSQL 17 runs locally through root Docker Compose with localhost-only access, a health check, and persistent storage. `db:up` starts it; `db:down` retains data.
- Server-only `@salary-manager/domain` owns Drizzle entities, inferred persistence types, connections, and committed SQL migrations. API contracts remain separate.
- `db:generate` generates migrations for review; `db:migrate` applies them explicitly. API startup checks connectivity and shutdown closes connections; startup never migrates.
- `db:reset` drops/recreates only the configured local Compose development database and applies migrations, installing master data without seeding employees.
- The initial-development baseline has exactly two migrations: initial schema and master data. Master data includes countries with optional default currencies, currencies and minor-unit precision, departments, job titles, and dated exact-decimal FX rates. Employees reference departments and job titles; titles can be shared across departments and level remains text. Employee salary currency remains explicit. Salary audit history retains old/new currencies and employee version, with an optional change reason. Salary-edit workflows and reporting are subsequent feature work.
