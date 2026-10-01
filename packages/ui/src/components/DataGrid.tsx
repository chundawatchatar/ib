import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type PaginationState,
	type RowData,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "../lib/utils";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
import { Icon, Icons } from "./Icon";
import { Skeleton } from "./Skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./Table";

declare module "@tanstack/react-table" {
	// Type parameters must match the library's declaration.
	interface ColumnMeta<TData extends RowData, TValue> {
		/** Right-align numeric columns such as amounts. */
		align?: "left" | "right";
	}
}

/**
 * Put on the one link in a row (such as the name) to make the whole row
 * open it. The link stays the only focusable, announced target per row and
 * keeps open-in-new-tab; its click area stretches over the row.
 */
export const rowLinkClass =
	"ui-row-link after:absolute after:inset-0 after:content-['']";

const alignClass = (align: "left" | "right" | undefined) =>
	align === "right" ? "text-right" : undefined;

export type DataGridProps<TData, TValue = unknown> = {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	label: string;
	className?: string;
	getRowId?: (row: TData, index: number) => string;
	isLoading?: boolean;
	isFetching?: boolean;
	error?: string;
	onRetry?: () => void;
	emptyMessage?: ReactNode;
	pagination?: PaginationState;
	onPaginationChange?: OnChangeFn<PaginationState>;
	sorting?: SortingState;
	onSortingChange?: OnChangeFn<SortingState>;
	manualPagination?: boolean;
	manualSorting?: boolean;
	rowCount?: number;
	/**
	 * Changes whenever the results are a new list (such as new filters), so the
	 * rows scroll back to the top. Page and sort changes reset it already.
	 */
	scrollResetKey?: string;
};

export function DataGrid<TData, TValue = unknown>({
	columns,
	data,
	label,
	className,
	getRowId,
	isLoading = false,
	isFetching = false,
	error,
	onRetry,
	emptyMessage = "No results found.",
	pagination,
	onPaginationChange,
	sorting,
	onSortingChange,
	manualPagination = false,
	manualSorting = manualPagination,
	rowCount,
	scrollResetKey = "",
}: DataGridProps<TData, TValue>) {
	const [localPagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [localSorting, setSorting] = useState<SortingState>([]);
	const scrollArea = useRef<HTMLDivElement>(null);
	// Manual (server) sorting only works when the consumer handles sort changes;
	// otherwise hide the controls rather than show a sort that never happens.
	const canSort = !manualSorting || onSortingChange !== undefined;
	const table = useReactTable({
		data,
		columns,
		getRowId,
		state: {
			pagination: pagination ?? localPagination,
			sorting: sorting ?? localSorting,
		},
		onPaginationChange: onPaginationChange ?? setPagination,
		onSortingChange: onSortingChange ?? setSorting,
		manualPagination,
		manualSorting,
		enableSorting: canSort,
		rowCount,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});
	const currentPage = table.getState().pagination;
	// A new page, order, or result set starts at the first row, however it was
	// reached (buttons, filters, or browser history).
	const resetKey = JSON.stringify([
		scrollResetKey,
		currentPage.pageIndex,
		table.getState().sorting,
	]);
	const lastResetKey = useRef(resetKey);
	useEffect(() => {
		if (lastResetKey.current === resetKey) return;
		lastResetKey.current = resetKey;
		if (scrollArea.current) scrollArea.current.scrollTop = 0;
	}, [resetKey]);
	const pageCount = table.getPageCount();
	const isEmpty = !isLoading && table.getRowModel().rows.length === 0;
	return (
		<section
			aria-label={label}
			aria-busy={isLoading || isFetching}
			className={cn("flex min-h-0 flex-col gap-3", className)}
		>
			{error && (
				<Alert
					variant="destructive"
					className="flex items-center justify-between gap-3"
				>
					{error}
					{onRetry && (
						<Button variant="secondary" size="sm" onClick={onRetry}>
							Retry
						</Button>
					)}
				</Alert>
			)}
			{/* Give the grid a height (layout class) to scroll rows under a sticky header. */}
			<div
				ref={scrollArea}
				className="flex min-h-0 flex-1 flex-col overflow-auto rounded-ui border border-border bg-surface"
			>
				<Table aria-label={label}>
					<TableHeader>
						{table.getHeaderGroups().map((group) => (
							<TableRow key={group.id}>
								{group.headers.map((header) => (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
										// A collapsed border scrolls away with the rows, so draw it as a shadow.
										className={cn(
											"sticky top-0 z-10 border-b-0 bg-surface shadow-[inset_0_-1px_0_var(--color-border)]",
											alignClass(header.column.columnDef.meta?.align),
										)}
										aria-sort={
											header.column.getCanSort()
												? header.column.getIsSorted() === "asc"
													? "ascending"
													: header.column.getIsSorted() === "desc"
														? "descending"
														: "none"
												: undefined
										}
									>
										{header.isPlaceholder ? null : header.column.getCanSort() ? (
											<Button
												variant="ghost"
												size="sm"
												// No side padding so the label lines up with its cells;
												// right-aligned columns lead with the icon for the same reason.
												className={cn(
													"h-auto gap-1.5 px-0",
													header.column.columnDef.meta?.align === "right" &&
														"flex-row-reverse",
												)}
												disabled={isLoading}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
												<Icon
													size="sm"
													icon={
														header.column.getIsSorted() === "asc"
															? Icons.ArrowUp
															: header.column.getIsSorted() === "desc"
																? Icons.ArrowDown
																: Icons.ArrowUpDown
													}
													className={
														header.column.getIsSorted()
															? undefined
															: "text-muted-foreground"
													}
												/>
											</Button>
										) : (
											flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={table.getVisibleLeafColumns().length}>
									<span role="status">Loading results…</span>
									<Skeleton className="mt-3 h-32" />
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									className="relative has-[.ui-row-link]:hover:bg-muted-foreground/5 has-[.ui-row-link:focus-visible]:bg-muted-foreground/5"
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											className={alignClass(cell.column.columnDef.meta?.align)}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
				{isEmpty && (
					// Fills the rest of the scroll area so the message sits in the middle.
					<div className="flex flex-1 items-center justify-center">
						{error ? (
							<p className="m-0 p-8 text-sm text-muted-foreground">
								Results unavailable.
							</p>
						) : typeof emptyMessage === "string" ? (
							<EmptyState title={emptyMessage} />
						) : (
							emptyMessage
						)}
					</div>
				)}
				<div
					aria-hidden="true"
					className="ui-scroll-fade pointer-events-none sticky bottom-0 -mt-12 h-12 shrink-0 bg-linear-to-t from-surface to-transparent"
				/>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-3">
				<span role="status" className="mr-auto text-sm">
					{table.getRowCount().toLocaleString()} results
					{pageCount > 0 &&
						` · Page ${currentPage.pageIndex + 1} of ${pageCount}`}
					{isFetching && !isLoading && (
						<span className="text-muted-foreground"> · Updating…</span>
					)}
				</span>
				<Button
					variant="secondary"
					size="sm"
					disabled={isLoading || !table.getCanPreviousPage()}
					onClick={() => table.previousPage()}
				>
					<Icon icon={Icons.ChevronLeft} size="sm" />
					Previous
				</Button>
				<Button
					variant="secondary"
					size="sm"
					disabled={isLoading || !table.getCanNextPage()}
					onClick={() => table.nextPage()}
				>
					Next
					<Icon icon={Icons.ChevronRight} size="sm" />
				</Button>
			</div>
		</section>
	);
}
