# UI

Shared React components for workspace applications. Keep routing, API requests,
and business logic in the consuming app. This package exports TypeScript source,
like the other shared packages; the app's bundler compiles it. The build script
checks types and does not emit a standalone distribution.

## Usage

Add `"@salary-manager/ui": "workspace:*"` to an app's dependencies. Components are
styled with Tailwind CSS v4 utilities, so the app must use Tailwind v4. Import the
stylesheet once in its global CSS, after Tailwind:

```css
@import "tailwindcss";
@import "@salary-manager/ui/styles.css";
```

The stylesheet registers the theme tokens and tells Tailwind to scan this package
for class names; it contains no component CSS of its own.

```tsx
import { Button, Input } from "@salary-manager/ui";

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

Button supports `primary`, `secondary`, `outline`, `ghost`, and `destructive` variants,
`default`, `sm`, `lg`, and `icon` sizes, and defaults to `type="button"`.
Use `asChild` to style a link through Radix Slot; supply an accessible name for icon buttons.
Both components accept native element props, including React 19 refs. Inputs
need an associated label or an accessible name supplied by the consumer.

## Styling and theming

Components follow shadcn/ui conventions: `cva` variants built from Tailwind
utilities, merged with `cn()` (clsx + tailwind-merge), and Radix Slot for `asChild`.
Every variant sets its own colors, so variants never depend on CSS rule order.
Add new looks as variants here; apps pass only layout classes.

Theme by setting these variables in the app (including dark mode):

| Variable | Tailwind token |
| --- | --- |
| `--ui-primary` / `--ui-on-primary` | `primary` / `primary-foreground` |
| `--ui-surface` | `surface` |
| `--ui-text` | `foreground` |
| `--ui-muted` | `muted-foreground` |
| `--ui-border` | `border` |
| `--ui-focus` | `ring` |
| `--ui-danger` / `--ui-on-danger` | `destructive` / `destructive-foreground` |
| `--ui-radius` | `rounded-ui` |

The client maps these to its light/dark palette.

## Checks

Run from the repository root using the pinned pnpm version:

```sh
pnpm --filter @salary-manager/ui run typecheck
pnpm --filter @salary-manager/ui run test
pnpm --filter @salary-manager/ui run build
pnpm run biome
```

Add components under `src/components/` and export them from `src/index.ts`.

## Components

Exports include Button, Input, Label, Textarea, native Select and Checkbox,
Badge, Card (Header/Title/Description/Content/Footer), Alert (Title/Description),
Skeleton, SearchInput, Table primitives, and DataGrid. Native controls preserve
browser keyboard and form behavior. Associate controls with Label using `htmlFor`.
Use `<Input type="search" onDebouncedChange={handleSearch} />` for search.
The optional `onDebouncedChange` callback defaults to a 300 ms delay (customize with
`debounceMs`) and clears immediately. Native `onChange` still fires on every keystroke.
For controlled inputs, update `value` in `onChange`; use `onDebouncedChange` for search requests.
SearchInput remains a convenience wrapper with the same behavior.
Supply `aria-label` or an associated label. The debounce always calls the latest
`onDebouncedChange`, so callbacks that close over current state stay correct.

## Data grid

DataGrid uses TanStack Table v8 with semantic HTML tables. Supply an accessible
`label`, typed columns and data; custom cell renderers are supported. Local sorting
and pagination (10 rows per page) work by default. Use `getRowId` for stable IDs.

```tsx
import { DataGrid, type ColumnDef } from "@salary-manager/ui";

type Employee = { id: string; name: string };
const columns: ColumnDef<Employee>[] = [{ accessorKey: "name", header: "Name" }];

export function EmployeeGrid({ employees }: { employees: Employee[] }) {
  return <DataGrid label="Employees" columns={columns} data={employees}
    getRowId={(employee) => employee.id} />;
}
```

For server data, pass `manualPagination`, the total `rowCount`, `pagination` and
`onPaginationChange`. Manual sorting defaults on with server pagination; pass
`sorting` and `onSortingChange` to enable sortable headers that trigger server
requests. Without `onSortingChange`, server-paginated grids show no sort controls. Controlled state and its
change callback must be supplied together. The consumer owns fetching and URL state.
Use zero-based `pageIndex` and a positive `pageSize`. Reset the page when filters change.
`isLoading` displays skeletons; `isFetching` retains rows with an update indicator.
`emptyMessage`, `error` (a user-facing message), and `onRetry` customize feedback.

Skeleton animation respects reduced motion.
