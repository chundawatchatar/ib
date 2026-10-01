import type { ComponentProps } from "react";
import { cn } from "../lib/utils.js";
import { fieldClasses } from "./Input.js";

export type TextareaProps = ComponentProps<"textarea">;
export function Textarea({ className, ...props }: TextareaProps) {
	return (
		<textarea
			{...props}
			className={cn(fieldClasses, "min-h-28 resize-y", className)}
		/>
	);
}
