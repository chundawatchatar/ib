import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
	return (
		<table
			{...props}
			className={cn(
				"w-full border-collapse bg-surface text-foreground tabular-nums",
				className,
			)}
		/>
	);
}
export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
	return <thead {...props} className={className} />;
}
export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
	return (
		<tbody
			{...props}
			className={cn("[&>tr:last-child>td]:border-b-0", className)}
		/>
	);
}
export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
	return <tfoot {...props} className={className} />;
}
export function TableRow({ className, ...props }: ComponentProps<"tr">) {
	return <tr {...props} className={className} />;
}
export function TableHead({ className, ...props }: ComponentProps<"th">) {
	return (
		<th
			{...props}
			className={cn(
				"whitespace-nowrap border-b border-border px-4 py-3 text-left font-semibold",
				className,
			)}
		/>
	);
}
export function TableCell({ className, ...props }: ComponentProps<"td">) {
	return (
		<td
			{...props}
			className={cn("border-b border-border px-4 py-3 text-left", className)}
		/>
	);
}
export function TableCaption({
	className,
	...props
}: ComponentProps<"caption">) {
	return (
		<caption
			{...props}
			className={cn("p-3 text-muted-foreground", className)}
		/>
	);
}
