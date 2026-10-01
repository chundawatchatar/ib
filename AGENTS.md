# Repository Guidelines

## Product Requirements

Read [docs/requirements.md](docs/requirements.md) before implementing features.
Use it as the source of truth for product scope and acceptance criteria.
Clarify ambiguities before coding, and update it when agreed requirements change.

## Local Agent Skills

Read the [local skill index](.agents/skills/README.md) and the relevant skill before changing API endpoints, shared contracts/types, database schema/migrations/seed data, or backend/frontend tests.

## Project Structure & Module Organization

Organize runnable applications in `apps/` and shared libraries in `packages/`. Each project must have a `package.json` directly beneath one of these directories. Keep application logic in its owning app.

Place implementation files in each project's `src/` directory. Keep tests and assets with their owning project. Shared compiler options live in `tsconfig.base.json`; the root `tsconfig.json` extends it. Biome uses the root `biome.json`.

## Build, Test, and Development Commands

Run commands from the root using the pnpm version pinned in `package.json`.

- `pnpm install`: install workspace dependencies using the shared lockfile.
- `pnpm run biome`: check formatting, lint rules, and import organization.
- `pnpm run lint`: run lint checks only.
- `pnpm run lint:fix`: apply safe lint fixes.
- `pnpm run format`: write Biome formatting changes.

Define appropriate `dev`, `build`, `test`, and `typecheck` scripts in each workspace project. Target projects with `pnpm --filter <package-name> run <script>`.

## Coding Style & Naming Conventions

Use strictly typed TypeScript and ES modules. Preserve strict compiler settings, avoid `any`, and narrow or validate `unknown` values at external boundaries. Prefer type narrowing over unchecked assertions.

Biome enforces tab indentation, double quotes, and recommended lint rules. Run `pnpm run biome` before submitting changes. VS Code recommendations and save settings are in `.vscode/`.

Name workspace packages `@<root-package-name>/<directory-name>`, such as `@salary-manager/client`, `@salary-manager/api`, and `@salary-manager/common`. Keep filename casing consistent with imports.

## Testing Guidelines

Use Vitest for tests. Name tests `feature.test.ts` or `feature.test.tsx` and keep them near the relevant code. Cover observable behavior, error paths, and edge cases. Add regression tests for bug fixes and contract tests for API changes. Run affected tests and typechecks before submitting a pull request.

## Commit & Pull Request Guidelines

Use Conventional Commits with concise, imperative subjects: `feat`, `fix`, or `chore`. Example: `feat(api): add user profile contract`.

Pull requests should describe the change, explain its purpose, and report verification results. Link related issues and include screenshots for visible UI changes.

## Configuration & Secrets

Commit `pnpm-lock.yaml` with dependency changes. Keep secrets in ignored `.env` files; document required variables in `.env.example` without real credentials.
