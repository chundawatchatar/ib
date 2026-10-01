import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn, disabledState, focusRing } from "../lib/utils";

export const buttonVariants = cva(
	[
		"inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-ui border font-semibold enabled:hover:brightness-95",
		focusRing,
		disabledState,
	],
	{
		variants: {
			variant: {
				primary: "border-border bg-primary text-primary-foreground",
				secondary: "border-border bg-surface text-foreground",
				outline: "border-border bg-transparent text-foreground",
				ghost: "border-transparent bg-transparent text-foreground",
				destructive: "border-border bg-destructive text-destructive-foreground",
			},
			size: {
				default: "px-4 py-2.5",
				sm: "px-2.5 py-1.5 text-sm",
				lg: "px-6 py-3.5",
				icon: "size-11 p-0",
			},
		},
		defaultVariants: { variant: "primary", size: "default" },
	},
);
export type ButtonProps = ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({
	variant,
	size,
	type = "button",
	asChild = false,
	className,
	...props
}: ButtonProps) {
	const Component = asChild ? Slot : "button";
	return (
		<Component
			{...props}
			{...(!asChild ? { type } : {})}
			className={cn(buttonVariants({ variant, size }), className)}
		/>
	);
}
