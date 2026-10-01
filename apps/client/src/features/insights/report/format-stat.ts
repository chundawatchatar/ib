import type { PayInsightsResponse } from "@salary-manager/contracts";
import { money } from "#/lib/format";

type Summary = PayInsightsResponse["summaries"][number];

/** A summary statistic as money, or a dash when the population is empty. */
export function stat(summary: Summary, value: string | null): string {
	return value === null
		? "—"
		: money(value, summary.currencyCode, summary.currencyMinorUnits);
}
