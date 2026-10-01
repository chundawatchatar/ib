import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { fieldClasses } from "./Input";

export type SelectProps = ComponentProps<"select">;
export function Select({ className, ...props }: SelectProps) {
	return <select {...props} className={cn(fieldClasses, className)} />;
}
