import type { ComponentProps } from "react";
import { cn } from "../lib/utils.js";
import { fieldClasses } from "./Input.js";

export type SelectProps = ComponentProps<"select">;
export function Select({ className, ...props }: SelectProps) {
	return <select {...props} className={cn(fieldClasses, className)} />;
}
