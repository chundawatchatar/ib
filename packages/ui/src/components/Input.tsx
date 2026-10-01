import { cva, type VariantProps } from "class-variance-authority";
import { type ComponentProps, useEffect, useRef } from "react";
import { cn, disabledState } from "../lib/utils";
import { Icon, type IconComponent } from "./Icon";

// Shared by Input, Select, and Textarea. Fields default to the compact size.
export const fieldVariants = cva(
	[
		"box-border w-full rounded-ui border border-border bg-surface text-foreground placeholder:text-muted-foreground aria-invalid:border-destructive",
		// Fields show focus on every click, so only recolor the border rather
		// than use the offset ring buttons show for keyboard focus.
		"outline-none focus-visible:border-ring aria-invalid:focus-visible:border-destructive",
		disabledState,
	],
	{
		variants: {
			size: {
				sm: "px-2.5 py-1 text-sm",
				md: "px-3 py-2",
				lg: "px-4 py-2.5 text-lg",
			},
		},
		defaultVariants: { size: "sm" },
	},
);

export type FieldSize = NonNullable<VariantProps<typeof fieldVariants>["size"]>;

// Single-line controls share the Button heights so rows of controls line up.
export const fieldHeights: Record<FieldSize, string> = {
	sm: "h-8",
	md: "h-10",
	lg: "h-12",
};

// Padding that leaves room for a leading or trailing icon.
export const fieldIconInset = {
	start: { sm: "pl-8", md: "pl-9", lg: "pl-11" },
	end: { sm: "pr-8", md: "pr-9", lg: "pr-11" },
} satisfies Record<string, Record<FieldSize, string>>;

export const fieldIconPosition = {
	start: { sm: "left-2.5", md: "left-3", lg: "left-4" },
	end: { sm: "right-2.5", md: "right-3", lg: "right-4" },
} satisfies Record<string, Record<FieldSize, string>>;

export type InputProps = Omit<ComponentProps<"input">, "size"> & {
	size?: FieldSize;
	/** Decorative icon shown before the value. */
	icon?: IconComponent;
	debounceMs?: number;
	onDebouncedChange?: (value: string) => void;
};

export function Input({
	className,
	size = "sm",
	icon,
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
	const input = (
		<input
			{...props}
			className={cn(
				fieldVariants({ size }),
				fieldHeights[size],
				icon && fieldIconInset.start[size],
				!icon && className,
			)}
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
	if (!icon) return input;
	return (
		<div className={cn("relative inline-block w-full", className)}>
			<Icon
				icon={icon}
				size={size}
				className={cn(
					"pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
					fieldIconPosition.start[size],
				)}
			/>
			{input}
		</div>
	);
}
