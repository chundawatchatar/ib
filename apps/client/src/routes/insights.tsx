import { createFileRoute } from "@tanstack/react-router";
import { insightQueries } from "#/features/insights/api";
import { Insights } from "#/features/insights/report/Insights";
import {
	insightsSearchSchema,
	toGroupsQuery,
	toInsightsQuery,
} from "#/features/insights/report/insights-search";
import { referenceDataQuery } from "#/features/reference-data/api";

export const Route = createFileRoute("/insights")({
	validateSearch: insightsSearchSchema,
	loaderDeps: ({ search }) => search,
	loader: async ({ context: { queryClient }, deps }) => {
		// Reports load in parallel without blocking; each section shows a skeleton.
		const query = toInsightsQuery(deps);
		void queryClient.prefetchQuery(insightQueries.summary(query));
		void queryClient.prefetchQuery(insightQueries.histogram(query));
		void queryClient.prefetchQuery(insightQueries.groups(toGroupsQuery(deps)));
		await queryClient.ensureQueryData(referenceDataQuery);
	},
	component: InsightsPage,
});

function InsightsPage() {
	return (
		<main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
			<Insights />
		</main>
	);
}
