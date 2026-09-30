# UI

Shared React components for workspace applications. Keep routing, API requests,
and business logic in the consuming app. This package exports TypeScript source,
like the other shared packages; the app's bundler compiles it. The build script
checks types and does not emit a standalone distribution.

## Usage

Add `"@payroll/ui": "workspace:*"` to an app's dependencies. Import the stylesheet
once in its global CSS, after Tailwind if used:

```css
@import "@payroll/ui/styles.css";
```

```tsx
import { Button, Input } from "@payroll/ui";

export function NameForm() {
	return (
		<form>
			<label htmlFor="name">Name</label>
			<Input id="name" name="name" required />
			<Button type="submit">Save</Button>
		</form>
	);
}
```

Button supports `primary` and `secondary` variants and defaults to `type="button"`.
Both components accept native element props, including React 19 refs. Inputs
need an associated label or an accessible name supplied by the consumer.

Styles use the `payroll-ui` CSS layer so app utilities can override them.
Customize `--ui-primary`, `--ui-on-primary`, `--ui-surface`, `--ui-text`,
`--ui-border`, `--ui-focus`, and `--ui-radius` in the app's theme. The client
maps these tokens to its existing light/dark palette.

## Checks

Run from the repository root using the pinned pnpm version:

```sh
pnpm --filter @payroll/ui run typecheck
pnpm --filter @payroll/ui run test
pnpm --filter @payroll/ui run build
pnpm run biome
```

Add components under `src/components/` and export them from `src/index.ts`.
