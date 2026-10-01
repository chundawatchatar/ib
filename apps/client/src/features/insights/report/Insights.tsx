import { Button, SegmentedControl, Select } from "@salary-manager/ui";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { referenceDataQuery } from "#/features/reference-data/api";
import { insightQueries } from "../api";
import { InsightsFilters } from "./InsightsFilters";
import {
	groupByOptions,
	hasFilters,
	type InsightsSearch,
	toGroupsQuery,
	toInsightsQuery,
} from "./insights-search";
import { PayDistribution } from "./PayDistribution";
import { PayGroupsTable } from "./PayGroupsTable";
import { PaySummaryTable } from "./PaySummaryTable";
import { ReportSection } from "./ReportSection";

const route = getRouteApi("/insights");

const views = [
	{ value: "local", label: "Local currency" },
	{ value: "usd", label: "USD" },
] as const;

export function Insights() {
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const { data: reference } = useSuspenseQuery(referenceDataQuery);
	const query = toInsightsQuery(search);
	const summary = useQuery(insightQueries.summary(query));
	const histogram = useQuery(insightQueries.histogram(query));
	const groups = useQuery(insightQueries.groups(toGroupsQuery(search)));
	const groupBy = toGroupsQuery(search).groupBy;
	const groupLabel =
		groupByOptions.find((option) => option.value === groupBy)?.label ?? "Group";

	const setSearch = (changes: Partial<InsightsSearch>) =>
		navigate({
			search: (previous) => ({ ...previous, ...changes }),
			replace: true,
		});
	const empty = summary.data?.headcount === 0;
	const emptyMessage = hasFilters(search)
		? "No employees match these filters."
		: "No active employees to report on.";

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="m-0 text-xl font-semibold">Pay insights</h1>
				<SegmentedControl
					label="Currency basis"
					name="view"
					value={query.view ?? "local"}
					options={views}
					onChange={(view) =>
						setSearch({ view: view === "local" ? undefined : view })
					}
				/>
			</div>
			<InsightsFilters
				search={search}
				reference={reference}
				onChange={setSearch}
			/>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="m-0 text-sm text-muted-foreground">
					{basis(query.view, summary.data?.rateDate)}
				</p>
				{hasFilters(search) && (
					<Button
						variant="secondary"
						size="sm"
						onClick={() =>
							navigate({
								search: (previous) => ({
									view: previous.view,
									groupBy: previous.groupBy,
								}),
							})
						}
					>
						Clear filters
					</Button>
				)}
			</div>
			<ReportSection title="Summary" query={summary}>
				{(report) =>
					empty ? (
						<p className="m-0 text-sm">{emptyMessage}</p>
					) : (
						<PaySummaryTable report={report} />
					)
				}
			</ReportSection>
			<ReportSection
				title="Salary distribution"
				query={histogram}
				action={
					histogram.data && histogram.data.distributions.length > 1 ? (
						<Select
							aria-label="Distribution currency"
							className="w-auto"
							value={chartCurrency(histogram.data.distributions, search)}
							onChange={(event) =>
								setSearch({ chartCurrency: event.target.value })
							}
						>
							{histogram.data.distributions.map((distribution) => (
								<option
									key={distribution.currencyCode}
									value={distribution.currencyCode}
								>
									{distribution.currencyCode}
								</option>
							))}
						</Select>
					) : undefined
				}
			>
				{(report) => {
					const code = chartCurrency(report.distributions, search);
					const distribution = report.distributions.find(
						(item) => item.currencyCode === code,
					);
					return distribution && distribution.headcount > 0 ? (
						<PayDistribution distribution={distribution} />
					) : (
						<p className="m-0 text-sm">{emptyMessage}</p>
					);
				}}
			</ReportSection>
			<ReportSection
				title={`Pay by ${groupLabel.toLowerCase()}`}
				query={groups}
				action={
					<Select
						aria-label="Group by"
						className="w-auto"
						value={groupBy}
						onChange={(event) => {
							const value = groupByOptions.find(
								(option) => option.value === event.target.value,
							)?.value;
							setSearch({ groupBy: value === "country" ? undefined : value });
						}}
					>
						{groupByOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</Select>
				}
			>
				{(report) =>
					report.groups.length ? (
						<PayGroupsTable report={report} groupLabel={groupLabel} />
					) : (
						<p className="m-0 text-sm">{emptyMessage}</p>
					)
				}
			</ReportSection>
		</div>
	);
}

function basis(
	view: "local" | "usd" | undefined,
	rateDate: string | null | undefined,
) {
	if (view !== "usd")
		return "Amounts in each employee's salary currency. Each currency is reported separately.";
	return rateDate
		? `All amounts converted to USD at exchange rates dated ${rateDate}.`
		: "All amounts converted to USD.";
}

/** The chosen currency if it has a distribution, else the one with most people. */
function chartCurrency(
	distributions: { currencyCode: string; headcount: number }[],
	search: InsightsSearch,
): string | undefined {
	if (distributions.some((item) => item.currencyCode === search.chartCurrency))
		return search.chartCurrency;
	return distributions.reduce<(typeof distributions)[number] | undefined>(
		(largest, item) =>
			!largest || item.headcount > largest.headcount ? item : largest,
		undefined,
	)?.currencyCode;
}
