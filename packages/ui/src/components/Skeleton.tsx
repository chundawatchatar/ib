import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type SkeletonProps = ComponentProps<"div">;
export function Skeleton({ className, ...props }: SkeletonProps) {
	return (
		<div
			{...props}
			aria-hidden="true"
			className={cn(
				"min-h-4 animate-pulse rounded-ui bg-border motion-reduce:animate-none",
				className,
			)}
		/>
	);
}
