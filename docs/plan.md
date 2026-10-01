# Plan

What to build next and in what order. Scope and acceptance criteria live in
[requirements](requirements.md); reasoning lives in [decisions](decisions.md).
Keep items small (about one commit each). Tick an item in the commit that
completes it and add the commit hash.

## Now

- [ ] Declare Node.js `>=22.9` in the root `engines` field
- [ ] Regenerate client routes in the client `typecheck` script so `pnpm check` works after route changes

## Next

- [ ] Employee directory API: server pagination, name/code search, filters (country, department, level, currency, salary range), stable sorting, total count
- [ ] Employee create/view/edit/deactivate API with server-side validation
- [ ] Salary edit API: optimistic version check, audit row in the same transaction, conflict response for stale edits
- [ ] Pay insights: headcount, total, average, median, min, max, P25/P75 for the full filtered population; tested against the requirements acceptance numbers
- [ ] Insights grouping (country, department, level, job title), salary histogram, local-currency and USD-normalized views
- [ ] Frontend foundation: shadcn/ui + Tailwind in `packages/ui` (migrate Button and Input; add Skeleton, Table, SearchInput with debounce), TanStack Query provider, ts-rest client, `unwrap` helper, and router-loader integration in the client
- [ ] Directory UI with search, filters, and pagination
- [ ] Employee form and salary edit UI with loading, error, and conflict states
- [ ] Insights UI
- [ ] CI: `pnpm check` and `pnpm test:db` against a PostgreSQL service

## Later

- [ ] Deploy API, client, and PostgreSQL; run migrations and seed
- [ ] Root README: overview, setup, deployed link, demo video, links to docs
- [ ] `docs/ai-usage.md`: how agents, skills, and reviews were used, and where AI output was corrected
- [ ] Performance check: directory search under 500 ms locally over 10,000 employees
- [ ] Record the demo video

## Done

- [x] Workspace, TypeScript, and Biome setup (bd6d37d)
- [x] Shared agent guidelines (603f643)
- [x] Client app (e99f0a8), typed API with bundling (0e8f80f), shared UI package (f84fcfb)
- [x] One-page requirements (8ee05f2)
- [x] Local agent skills (c2b505d)
- [x] PostgreSQL schema, migrations, and deterministic 10,000-employee seed (2f75924)
- [x] API database connectivity check and graceful shutdown (d18cbac)
- [x] Database-schema skill and backend/API rules (6a41404)
- [x] `pnpm check` and aligned workspace scripts (049a962)
