import type { ComponentProps } from "react";
import { cn, disabledState, focusRing } from "../lib/utils";

export type CheckboxProps = Omit<ComponentProps<"input">, "type">;
export function Checkbox({ className, ...props }: CheckboxProps) {
	return (
		<input
			{...props}
			type="checkbox"
			className={cn(
				"size-4 accent-primary",
				focusRing,
				disabledState,
				className,
			)}
		/>
	);
}
