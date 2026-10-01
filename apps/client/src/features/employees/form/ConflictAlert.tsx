import {
	Alert,
	AlertDescription,
	AlertTitle,
	Button,
} from "@salary-manager/ui";

type ConflictAlertProps = {
	onReload: () => void;
	isReloading: boolean;
};

export function ConflictAlert({ onReload, isReloading }: ConflictAlertProps) {
	return (
		<Alert variant="destructive">
			<AlertTitle>Someone else changed this employee</AlertTitle>
			<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
				Your change wasn't saved. Load the latest values, then make your change
				again.
				<Button variant="secondary" onClick={onReload} disabled={isReloading}>
					{isReloading ? "Loading…" : "Load latest values"}
				</Button>
			</AlertDescription>
		</Alert>
	);
}
