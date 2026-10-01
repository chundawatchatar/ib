import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils.js";

export const alertVariants = cva("rounded-ui border bg-surface p-5", {
	variants: {
		variant: {
			default: "border-border text-foreground",
			destructive: "border-destructive text-destructive",
		},
	},
	defaultVariants: { variant: "default" },
});
export type AlertProps = ComponentProps<"div"> &
	VariantProps<typeof alertVariants>;
export function Alert({ variant, className, ...props }: AlertProps) {
	return (
		<div
			role={variant === "destructive" ? "alert" : "status"}
			{...props}
			className={cn(alertVariants({ variant }), className)}
		/>
	);
}
export function AlertTitle({ className, ...props }: ComponentProps<"h3">) {
	return (
		<h3 {...props} className={cn("m-0 text-lg font-semibold", className)} />
	);
}
export function AlertDescription({
	className,
	...props
}: ComponentProps<"div">) {
	return <div {...props} className={cn("mt-2", className)} />;
}
