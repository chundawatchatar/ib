import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { Icon } from "./Icon";
import {
	type FieldSize,
	fieldHeights,
	fieldIconInset,
	fieldIconPosition,
	fieldVariants,
} from "./Input";

export type SelectProps = Omit<ComponentProps<"select">, "size"> & {
	size?: FieldSize;
};

/** Native select with the browser arrow replaced by a consistent chevron. */
export function Select({ className, size = "sm", ...props }: SelectProps) {
	return (
		<div className={cn("relative inline-block w-full", className)}>
			<select
				{...props}
				className={cn(
					fieldVariants({ size }),
					fieldHeights[size],
					fieldIconInset.end[size],
					"cursor-pointer appearance-none truncate",
				)}
			/>
			<Icon
				name="chevron-down"
				size={size}
				className={cn(
					"pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
					fieldIconPosition.end[size],
				)}
			/>
		</div>
	);
}
