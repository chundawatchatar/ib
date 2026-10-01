import type { PayInsightsHistogramResponse } from "@salary-manager/contracts";
import { ColumnChart } from "@salary-manager/ui";
import { money } from "#/lib/format";

type Distribution = PayInsightsHistogramResponse["distributions"][number];

export function PayDistribution({
	distribution,
}: {
	distribution: Distribution;
}) {
	const band = (bound: string) =>
		money(bound, distribution.currencyCode, distribution.currencyMinorUnits, {
			compact: true,
		});
	return (
		<ColumnChart
			title={`Salary distribution in ${distribution.currencyCode}`}
			labelHeader="Annual salary"
			valueHeader="Employees"
			data={distribution.buckets.map((bucket) => ({
				key: bucket.lowerBound,
				label:
					bucket.lowerBound === bucket.upperBound
						? band(bucket.lowerBound)
						: `${band(bucket.lowerBound)}–${band(bucket.upperBound)}`,
				value: bucket.headcount,
			}))}
		/>
	);
}
