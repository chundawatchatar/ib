import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			{...props}
			className={cn(
				"rounded-ui border border-border bg-surface text-foreground",
				className,
			)}
		/>
	);
}
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
	return <div {...props} className={cn("p-5", className)} />;
}
export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
	return (
		<h3 {...props} className={cn("m-0 text-lg font-semibold", className)} />
	);
}
export function CardDescription({ className, ...props }: ComponentProps<"p">) {
	return <p {...props} className={cn("text-muted-foreground", className)} />;
}
export function CardContent({ className, ...props }: ComponentProps<"div">) {
	return <div {...props} className={cn("p-5", className)} />;
}
export function CardFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div {...props} className={cn("flex items-center gap-2 p-5", className)} />
	);
}
