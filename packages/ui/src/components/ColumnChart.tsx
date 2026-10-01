import type { ReactNode } from "react";
import { cn, focusRing } from "../lib/utils";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./Table";

export type ColumnChartDatum = {
	key: string;
	/** Category label under the column, such as a salary band. */
	label: string;
	value: number;
};

export type ColumnChartProps = {
	/** Names the chart for assistive technology and the table view. */
	title: string;
	data: readonly ColumnChartDatum[];
	/** Column headers for the table view. */
	labelHeader: string;
	valueHeader: string;
	formatValue?: (value: number) => string;
	/** Extra text in each column's tooltip. */
	describe?: (datum: ColumnChartDatum) => ReactNode;
	className?: string;
};

/** Smallest 1, 2, or 5 × 10ⁿ at or above `value`, for clean axis ticks. */
export function niceMaximum(value: number): number {
	if (value <= 0) return 1;
	const magnitude = 10 ** Math.floor(Math.log10(value));
	const step =
		[1, 2, 5, 10].find((factor) => factor * magnitude >= value) ?? 10;
	return step * magnitude;
}

// Above this many columns, labels would collide, so only the ends are labeled.
const MAX_LABELED_COLUMNS = 8;

/**
 * Single-series column chart: one hue, thin columns with rounded tops, hairline
 * gridlines, a tooltip on hover or focus, and the same data as a table.
 */
export function ColumnChart({
	title,
	data,
	labelHeader,
	valueHeader,
	formatValue = (value) => value.toLocaleString(),
	describe,
	className,
}: ColumnChartProps) {
	const maximum = niceMaximum(Math.max(0, ...data.map((datum) => datum.value)));
	// A middle tick only when it is a whole number, such as 0 / 5 / 10.
	const middle = Number.isInteger(maximum / 2) ? maximum / 2 : undefined;
	const ticks = middle === undefined ? [maximum, 0] : [maximum, middle, 0];
	return (
		<figure className={cn("m-0 flex flex-col gap-3", className)}>
			<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
				<div
					aria-hidden="true"
					className="flex h-48 flex-col justify-between text-right text-xs text-muted-foreground tabular-nums"
				>
					{ticks.map((tick) => (
						<span key={tick} className="-translate-y-1/2 last:translate-y-1/2">
							{formatValue(tick)}
						</span>
					))}
				</div>
				<ol
					aria-label={title}
					className="relative m-0 flex h-48 list-none items-end gap-0.5 border-b border-border p-0"
				>
					<span
						aria-hidden="true"
						className="absolute inset-x-0 top-0 border-t border-border"
					/>
					{middle !== undefined && (
						<span
							aria-hidden="true"
							className="absolute inset-x-0 top-1/2 border-t border-border"
						/>
					)}
					{data.map((datum) => (
						<li
							key={datum.key}
							// biome-ignore lint/a11y/noNoninteractiveTabindex: focus reveals the tooltip for keyboard users.
							tabIndex={0}
							aria-label={`${datum.label}: ${formatValue(datum.value)}`}
							className={cn(
								"group relative flex h-full flex-1 items-end justify-center",
								focusRing,
							)}
						>
							<span
								className="block w-full max-w-6 rounded-t-[4px] bg-chart"
								style={{ height: `${(datum.value / maximum) * 100}%` }}
							/>
							<span
								role="tooltip"
								className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-56 rounded-ui border border-border bg-surface px-2 py-1 text-xs text-foreground shadow-sm group-hover:block group-focus:block"
							>
								<span className="block font-semibold">{datum.label}</span>
								{formatValue(datum.value)}
								{describe?.(datum)}
							</span>
						</li>
					))}
				</ol>
				<span />
				{/* Label every column when they fit; otherwise only the two ends. */}
				{data.length <= MAX_LABELED_COLUMNS && (
					<div
						aria-hidden="true"
						className="hidden gap-0.5 pt-1 text-center text-xs text-muted-foreground sm:flex"
					>
						{data.map((datum) => (
							<span key={datum.key} className="min-w-0 flex-1 truncate">
								{datum.label}
							</span>
						))}
					</div>
				)}
				<div
					aria-hidden="true"
					className={cn(
						"flex justify-between pt-1 text-xs text-muted-foreground",
						data.length <= MAX_LABELED_COLUMNS && "sm:hidden",
					)}
				>
					<span>{data[0]?.label}</span>
					<span>{data.at(-1)?.label}</span>
				</div>
			</div>
			<details>
				<summary className="cursor-pointer text-sm text-muted-foreground">
					Show as table
				</summary>
				<Table aria-label={title} className="mt-2">
					<TableHeader>
						<TableRow>
							<TableHead>{labelHeader}</TableHead>
							<TableHead className="text-right">{valueHeader}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.map((datum) => (
							<TableRow key={datum.key}>
								<TableCell>{datum.label}</TableCell>
								<TableCell className="text-right">
									{formatValue(datum.value)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</details>
		</figure>
	);
}
