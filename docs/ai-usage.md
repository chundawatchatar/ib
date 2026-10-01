# How AI was used

Coding agents (Claude Code and Codex) wrote most of the code; 34 of the first
43 commits carry a Claude co-author trailer. The human role was to set scope,
write the rules the agents follow, review every change, and overrule the
agents where their output was wrong or not what the product needed.

## Steering the agents

- **Requirements first.** [Requirements](requirements.md) were written and
  agreed before feature work. Agents treat them as the source of truth,
  including acceptance numbers that tests must reproduce.
- **One plan, small steps.** [Plan](plan.md) orders the work into roughly
  one-commit items. Agents work top-down and tick an item in the commit that
  completes it, so the history shows how the solution grew.
- **Shared rules.** [AGENTS.md](../AGENTS.md) (loaded by both tools through
  `CLAUDE.md`) fixes structure, commands, style, testing, and commit rules.
- **Task skills.** [Local skills](../.agents/skills/README.md) hold the
  detailed how-to for API endpoints, database schema, backend and frontend
  tests, frontend development, and design. Five are project-specific; the
  design skill comes from `anthropics/skills` (pinned in `skills-lock.json`).
  Skills were added and refined as patterns settled, rather than all up front.
- **Recorded reasoning.** Choices and trade-offs go in
  [decisions](decisions.md), so later agent sessions follow them instead of
  re-deciding.

## Checking the output

- `pnpm check` (Biome, typecheck, unit tests) runs before every commit;
  `pnpm test:db` runs real PostgreSQL integration tests for schema and query
  changes. CI runs both on every push.
- Pay-insight tests assert the hand-calculated acceptance numbers from the
  requirements, not values produced by the code under test.
- Performance was measured, not assumed: directory search timings over 10,000
  employees are recorded in decisions.

## Where AI output was corrected

- **USD conversion.** Pay insights converted USD through a stored USD→USD rate,
  so a missing or newer row could shift the report's rate date or drop USD
  salaries. Fixed to convert USD at exactly 1, with a regression test
  (`95d9649`).
- **Deployment shape.** The agent made the API serve the built client to avoid
  a proxy. That was rejected in favour of a separate static site that proxies
  `/api`, keeping the API focused on the API; the agent removed the code before
  committing (see the deployment decision).
- **Over-testing.** The agent added a regression test asserting a table
  header's alignment classes. It was removed: styling-only fixes are verified
  visually, and tests cover behavior. This became a standing agent rule.
