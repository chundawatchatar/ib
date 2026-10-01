# Plan

What to build next and in what order. Scope and acceptance criteria live in
[requirements](requirements.md); reasoning lives in [decisions](decisions.md).
Keep items small (about one commit each). Tick an item in the commit that
completes it and move it to Done; `git log` records which commit that was.

## Next

- [ ] Employee directory API: server pagination, name/code search, filters (country, department, level, currency, salary range), stable sorting, total count
- [ ] Employee create/view/edit/deactivate API with server-side validation
- [ ] Salary edit API: optimistic version check, audit row in the same transaction, conflict response for stale edits
- [ ] Pay insights: headcount, total, average, median, min, max, P25/P75 for the full filtered population; tested against the requirements acceptance numbers
- [ ] Insights grouping (country, department, level, job title), salary histogram, local-currency and USD-normalized views
- [ ] Client data layer: TanStack Query provider, ts-rest client, `unwrap` helper, and router-loader integration
- [ ] Directory UI with search, filters, and pagination
- [ ] Employee form and salary edit UI (React Hook Form with contract Zod schemas) with loading, error, and conflict states
- [ ] Insights UI
- [ ] CI: `pnpm check` and `pnpm test:db` against a PostgreSQL service

## Later

- [ ] Deploy API, client, and PostgreSQL; run migrations and seed
- [ ] Root README: overview, setup, deployed link, demo video, links to docs
- [ ] `docs/ai-usage.md`: how agents, skills, and reviews were used, and where AI output was corrected
- [ ] Performance check: directory search under 500 ms locally over 10,000 employees
- [ ] Record the demo video

## Done

- [x] Workspace, TypeScript, and Biome setup
- [x] Shared agent guidelines
- [x] Client app, typed API with bundling, shared UI package
- [x] One-page requirements
- [x] Local agent skills
- [x] PostgreSQL schema, migrations, and deterministic 10,000-employee seed
- [x] API database connectivity check and graceful shutdown
- [x] Database-schema skill and backend/API rules
- [x] `pnpm check` and aligned workspace scripts
- [x] Development plan and frontend-development skill
- [x] shadcn/ui + Tailwind component library in `packages/ui` (Button, Input, SearchInput with debounce, Skeleton, Table, DataGrid, and form controls)
- [x] Declare Node.js `>=22.9` in the root `engines` field
- [x] Generate client routes through the Start Vite plugin in `typecheck` and `build`, so `pnpm check` works after route changes
