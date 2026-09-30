import type { ComponentProps } from "react";

export type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
	return (
		<input
			{...props}
			className={["ui-input", className].filter(Boolean).join(" ")}
		/>
	);
}
