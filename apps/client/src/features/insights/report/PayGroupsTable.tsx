import type { PayInsightsGroupsResponse } from "@salary-manager/contracts";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@salary-manager/ui";
import { stat } from "./format-stat";

type PayGroupsTableProps = {
	report: PayInsightsGroupsResponse;
	groupLabel: string;
};

// In the local view a group can hold several currencies: one row per currency,
// with the group name spanning them, so amounts are never combined.
export function PayGroupsTable({ report, groupLabel }: PayGroupsTableProps) {
	return (
		<div className="overflow-x-auto">
			<Table aria-label={`Pay by ${groupLabel.toLowerCase()}`}>
				<TableHeader>
					<TableRow>
						<TableHead>{groupLabel}</TableHead>
						<TableHead>Currency</TableHead>
						<TableHead className="text-right">Headcount</TableHead>
						<TableHead className="text-right">Median</TableHead>
						<TableHead className="text-right">Average</TableHead>
						<TableHead className="text-right">25th–75th percentile</TableHead>
						<TableHead className="text-right">Lowest</TableHead>
						<TableHead className="text-right">Highest</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{report.groups.flatMap((group) =>
						group.summaries.map((summary, index) => (
							<TableRow key={`${group.key}-${summary.currencyCode}`}>
								{index === 0 && (
									<TableCell
										rowSpan={group.summaries.length}
										className="align-top font-medium"
									>
										{group.label}
									</TableCell>
								)}
								<TableCell>{summary.currencyCode}</TableCell>
								<TableCell className="text-right">
									{summary.headcount.toLocaleString()}
								</TableCell>
								<TableCell className="text-right">
									{stat(summary, summary.median)}
								</TableCell>
								<TableCell className="text-right">
									{stat(summary, summary.average)}
								</TableCell>
								<TableCell className="text-right">
									{stat(summary, summary.p25)} – {stat(summary, summary.p75)}
								</TableCell>
								<TableCell className="text-right">
									{stat(summary, summary.min)}
								</TableCell>
								<TableCell className="text-right">
									{stat(summary, summary.max)}
								</TableCell>
							</TableRow>
						)),
					)}
				</TableBody>
			</Table>
		</div>
	);
}
