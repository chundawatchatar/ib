import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
	Skeleton,
} from "@salary-manager/ui";
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { errorMessage } from "#/lib/api";

export function RoutePending() {
	return (
		<main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
			<span role="status" className="sr-only">
				Loading…
			</span>
			<Skeleton className="h-8 w-48" />
			<Skeleton className="h-10" />
			<Skeleton className="h-96" />
		</main>
	);
}

export function RouteError({ error }: ErrorComponentProps) {
	const router = useRouter();
	return (
		<main className="mx-auto max-w-7xl px-4 py-6">
			<Alert variant="destructive">
				<AlertTitle>This page couldn't load</AlertTitle>
				<AlertDescription className="flex items-center justify-between gap-3">
					{errorMessage(error, "The server didn't respond. Try again.")}
					<Button variant="secondary" onClick={() => router.invalidate()}>
						Try again
					</Button>
				</AlertDescription>
			</Alert>
		</main>
	);
}
