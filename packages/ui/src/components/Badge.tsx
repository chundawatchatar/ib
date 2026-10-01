import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils.js";

// Each variant sets its own text, border, and background so none inherit
// from the base and variants never depend on CSS rule order.
export const badgeVariants = cva(
	"inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
	{
		variants: {
			variant: {
				default: "border-border bg-surface text-foreground",
				secondary: "border-border bg-surface text-muted-foreground",
				destructive: "border-destructive bg-surface text-destructive",
				outline: "border-border bg-transparent text-foreground",
			},
		},
		defaultVariants: { variant: "default" },
	},
);
export type BadgeProps = ComponentProps<"span"> &
	VariantProps<typeof badgeVariants>;
export function Badge({ variant, className, ...props }: BadgeProps) {
	return (
		<span {...props} className={cn(badgeVariants({ variant }), className)} />
	);
}
