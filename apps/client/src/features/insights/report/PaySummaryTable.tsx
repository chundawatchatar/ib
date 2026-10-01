import type { PayInsightsResponse } from "@salary-manager/contracts";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@salary-manager/ui";
import { stat } from "./format-stat";

const statistics = [
	["total", "Total"],
	["average", "Average"],
	["median", "Median"],
	["p25", "25th percentile"],
	["p75", "75th percentile"],
	["min", "Lowest"],
	["max", "Highest"],
] as const;

export function PaySummaryTable({ report }: { report: PayInsightsResponse }) {
	return (
		<div className="overflow-x-auto">
			<Table aria-label="Pay summary">
				<TableHeader>
					<TableRow>
						<TableHead>Currency</TableHead>
						<TableHead className="text-right">Headcount</TableHead>
						{statistics.map(([key, label]) => (
							<TableHead key={key} className="text-right">
								{label}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{report.summaries.map((summary) => (
						<TableRow key={summary.currencyCode}>
							<TableCell className="font-medium">
								{summary.currencyCode}
							</TableCell>
							<TableCell className="text-right">
								{summary.headcount.toLocaleString()}
							</TableCell>
							{statistics.map(([key]) => (
								<TableCell key={key} className="text-right">
									{stat(summary, summary[key])}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
