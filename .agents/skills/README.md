# Local Agent Skills

Read the skill relevant to your task alongside [AGENTS.md](../../AGENTS.md) and the [product requirements](../../docs/requirements.md). These Markdown instructions can be used by any coding agent; no global installation is needed.

| Skill | Read when |
| --- | --- |
| [API endpoints](api-endpoints/SKILL.md) | Adding or changing HTTP endpoints, shared contracts, route constants, or shared types. Includes Zod-inferred request/response types and common package dependency rules. |
| [Database schema](database-schema/SKILL.md) | Changing tables, constraints, migrations, reference (master) data, or the employee seed in `packages/domain`. Includes key, money, and migration rules. |
| [Backend tests](backend-tests/SKILL.md) | Writing domain, database, HTTP, or API contract regression tests. |
| [Frontend development](frontend-development/SKILL.md) | Any change in `apps/client` or `packages/ui`: shadcn/Tailwind components, ts-rest + TanStack Query (queryOptions factories, mutation hooks), search, loading states, and React patterns. |
| [Frontend design](frontend-design/SKILL.md) | Building new UI or reshaping existing screens, including visual direction, typography, layout, and interface copy. |
| [Frontend tests](frontend-tests/SKILL.md) | Writing component, form, or frontend workflow tests. |

Read multiple skills when a change spans their responsibilities.

Read each `SKILL.md` directly from the paths above.

## Maintaining skills

Keep each skill in its own directory with a `SKILL.md` containing `name` and `description` YAML frontmatter. Add supporting `references/` or `scripts/` within a skill only when needed. Keep detailed task instructions in the owning skill and update this index when adding or removing a skill.
