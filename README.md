# ACME Salary Manager

A web app for ACME's HR Manager to maintain salaries for 10,000 employees across
countries and answer "how do we pay people?" without spreadsheets.

- **Live app:** <https://salary-manager-t0dg.onrender.com> (free tier: the first request can take about a minute; see [deployment](docs/deployment.md))
- **Demo video:** [walkthrough](https://drive.google.com/file/d/19Q0ziKPK2Ih296HnvAl6_YT0sxqzara6/view?usp=sharing)

## What it does

- **Employee directory:** server-paginated search by name or code, filters by
  country, department, level, currency, and salary range, with stable sorting
  and total match counts.
- **Employee and salary management:** create, view, edit, and deactivate
  employees. Salary edits are validated on the server, saved atomically with a
  change-log row, and protected against stale edits by optimistic locking.
- **Pay insights:** headcount, total, average, median, min, max, and P25/P75
  for the whole filtered population, grouped by country, department, level, or
  job title, plus a salary histogram. Reports show local currencies separately
  or normalize to USD at a dated rate; currencies are never silently combined.

Scope, exclusions, and acceptance criteria are in the
[requirements](docs/requirements.md).

## Architecture

```text
Browser ── /api ──▶ API (Express + ts-rest) ──▶ PostgreSQL 17
  │                     │
  └ React SPA           └ Drizzle queries and SQL migrations
```

| Project | Purpose |
| --- | --- |
| [`apps/client`](apps/client/README.md) | React SPA: TanStack Start/Router, TanStack Query, React Hook Form |
| [`apps/api`](apps/api/README.md) | Express API implementing the shared contracts |
| `packages/contracts` | ts-rest contracts and Zod schemas shared by client and API |
| `packages/common` | Route constants and money formatting shared by both apps |
| [`packages/domain`](packages/domain/README.md) | Server-only schema, migrations, database access, and seed |
| [`packages/ui`](packages/ui/README.md) | shadcn/ui and Tailwind component library |

Money is stored as integer minor units and formatted without floating point.
The reasoning behind these and other choices is in [decisions](docs/decisions.md).

## Getting started

Requires Node.js 22.9 or newer, the pnpm version pinned in `package.json`, and
Docker.

```sh
pnpm install
cp .env.example .env
pnpm db:up        # start PostgreSQL on localhost:55432
pnpm db:migrate   # schema and reference data
pnpm db:seed      # 10,000 deterministic employees
pnpm dev          # API on :3001, client on http://localhost:3000
```

`pnpm db:reset` recreates the local database without employees.

## Quality checks

| Command | Runs |
| --- | --- |
| `pnpm check` | Biome, typecheck, and unit tests (run before every change) |
| `pnpm test:db` | Integration tests against real PostgreSQL (`pnpm db:up` first) |
| `pnpm build` | Production builds of every project |

CI runs `pnpm check` and `pnpm test:db` on every push and pull request.

## Documentation

- [Requirements](docs/requirements.md): goal, scope, exclusions, and acceptance
- [Decisions](docs/decisions.md): architectural choices and their trade-offs,
  including performance measurements
- [Plan](docs/plan.md): build order and remaining work
- [AI usage](docs/ai-usage.md): how coding agents were steered, checked,
  and corrected
- [Deployment](docs/deployment.md): hosting and what contributors must keep in
  mind
- [Contributor guidelines](AGENTS.md) and [agent skills](.agents/skills/README.md):
  conventions shared by people and coding agents
