import { type ComponentProps, useEffect, useRef } from "react";
import { cn, disabledState, focusRing } from "../lib/utils.js";

// Shared by Input, Select, and Textarea.
export const fieldClasses = cn(
	"box-border w-full rounded-ui border border-border bg-surface px-3 py-2.5 text-foreground placeholder:text-muted-foreground aria-invalid:border-destructive",
	focusRing,
	disabledState,
);

export type InputProps = ComponentProps<"input"> & {
	debounceMs?: number;
	onDebouncedChange?: (value: string) => void;
};

export function Input({
	className,
	debounceMs = 300,
	onDebouncedChange,
	onChange,
	...props
}: InputProps) {
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	// The pending timer must call the latest callback, not the one captured
	// when the key was pressed, or a re-render would deliver stale state.
	const latestCallback = useRef(onDebouncedChange);
	useEffect(() => {
		latestCallback.current = onDebouncedChange;
	});
	useEffect(() => () => clearTimeout(timer.current), []);
	return (
		<input
			{...props}
			className={cn(fieldClasses, className)}
			onChange={(event) => {
				const next = event.currentTarget.value;
				onChange?.(event);
				clearTimeout(timer.current);
				if (!onDebouncedChange) return;
				if (next === "") onDebouncedChange(next);
				else
					timer.current = setTimeout(
						() => latestCallback.current?.(next),
						debounceMs,
					);
			}}
		/>
	);
}
