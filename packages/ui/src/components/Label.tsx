import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export type LabelProps = ComponentProps<"label">;
export function Label({ className, htmlFor, children, ...props }: LabelProps) {
	return (
		<label
			{...props}
			htmlFor={htmlFor}
			className={cn("inline-block text-sm font-semibold", className)}
		>
			{children}
		</label>
	);
}
