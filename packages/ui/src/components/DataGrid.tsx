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
import { type ReactNode, useState } from "react";
import { cn } from "../lib/utils";
import { Alert } from "./Alert";
import { Button } from "./Button";
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
}: DataGridProps<TData, TValue>) {
	const [localPagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [localSorting, setSorting] = useState<SortingState>([]);
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
	const pageCount = table.getPageCount();
	return (
		<section
			aria-label={label}
			aria-busy={isLoading || isFetching}
			className={cn("flex flex-col gap-3", className)}
		>
			{error && (
				<Alert
					variant="destructive"
					className="flex items-center justify-between gap-3"
				>
					{error}
					{onRetry && (
						<Button variant="secondary" onClick={onRetry}>
							Retry
						</Button>
					)}
				</Alert>
			)}
			{isFetching && !isLoading && (
				<p role="status" className="text-sm text-muted-foreground">
					Updating results…
				</p>
			)}
			<div className="overflow-x-auto rounded-ui border border-border">
				<Table aria-label={label}>
					<TableHeader>
						{table.getHeaderGroups().map((group) => (
							<TableRow key={group.id}>
								{group.headers.map((header) => (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
										className={alignClass(header.column.columnDef.meta?.align)}
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
												disabled={isLoading}
												onClick={header.column.getToggleSortingHandler()}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
												<span aria-hidden="true">
													{header.column.getIsSorted() === "asc"
														? " ↑"
														: header.column.getIsSorted() === "desc"
															? " ↓"
															: " ↕"}
												</span>
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
						) : table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
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
						) : (
							<TableRow>
								<TableCell
									colSpan={Math.max(1, table.getVisibleLeafColumns().length)}
								>
									{error ? "Results unavailable." : emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-3">
				<span role="status" className="mr-auto">
					{table.getRowCount().toLocaleString()} results · Page{" "}
					{pageCount === 0 ? 0 : currentPage.pageIndex + 1} of {pageCount}
				</span>
				<Button
					variant="secondary"
					disabled={isLoading || !table.getCanPreviousPage()}
					onClick={() => table.previousPage()}
				>
					Previous
				</Button>
				<Button
					variant="secondary"
					disabled={isLoading || !table.getCanNextPage()}
					onClick={() => table.nextPage()}
				>
					Next
				</Button>
			</div>
		</section>
	);
}
