import {
	Alert,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Skeleton,
} from "@salary-manager/ui";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { errorMessage } from "#/lib/api";

type ReportSectionProps<T> = {
	title: string;
	/** Optional control beside the title, such as a group-by choice. */
	action?: ReactNode;
	query: UseQueryResult<T>;
	children: (data: T) => ReactNode;
};

/** A report card with its own skeleton, error-with-retry, and refreshing state. */
export function ReportSection<T>({
	title,
	action,
	query,
	children,
}: ReportSectionProps<T>) {
	return (
		<Card aria-busy={query.isFetching}>
			<CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-0">
				<CardTitle>{title}</CardTitle>
				{action}
			</CardHeader>
			<CardContent>
				{query.isPending ? (
					<>
						<span role="status" className="sr-only">
							Loading {title.toLowerCase()}…
						</span>
						<Skeleton className="h-40" />
					</>
				) : query.isError ? (
					<Alert
						variant="destructive"
						className="flex items-center justify-between gap-3"
					>
						{errorMessage(query.error, `Couldn't load ${title.toLowerCase()}.`)}
						<Button variant="secondary" onClick={() => query.refetch()}>
							Retry
						</Button>
					</Alert>
				) : (
					<div className={query.isPlaceholderData ? "opacity-60" : undefined}>
						{children(query.data)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
