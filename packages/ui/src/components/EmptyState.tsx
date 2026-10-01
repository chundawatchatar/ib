import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Icon, type IconComponent } from "./Icon";

export type EmptyStateProps = {
	title: ReactNode;
	description?: ReactNode;
	/** Decorative icon above the title. */
	icon?: IconComponent;
	/** The next step, such as a button to clear filters. */
	action?: ReactNode;
	className?: string;
};

/** Centered explanation for an empty view, with an optional next step. */
export function EmptyState({
	title,
	description,
	icon,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center gap-2 p-8 text-center",
				className,
			)}
		>
			{icon && (
				<span className="mb-1 flex size-10 items-center justify-center rounded-full bg-muted-foreground/10 text-muted-foreground">
					<Icon icon={icon} size="lg" />
				</span>
			)}
			<p className="m-0 font-semibold">{title}</p>
			{description && (
				<p className="m-0 max-w-md text-sm text-muted-foreground">
					{description}
				</p>
			)}
			{action && <div className="mt-2">{action}</div>}
		</div>
	);
}
