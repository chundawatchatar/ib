import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { type FieldSize, fieldVariants } from "./Input";

export type TextareaProps = ComponentProps<"textarea"> & { size?: FieldSize };
export function Textarea({ className, size, ...props }: TextareaProps) {
	return (
		<textarea
			{...props}
			className={cn(fieldVariants({ size }), "min-h-28 resize-y", className)}
		/>
	);
}
