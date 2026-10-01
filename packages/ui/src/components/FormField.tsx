import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Label } from "./Label";

/** Ids a control passes to `aria-describedby` for this field's help and error. */
export function fieldDescriptionIds(
	id: string,
	{ description, error }: { description?: ReactNode; error?: string },
): string | undefined {
	const ids = [
		description ? `${id}-description` : undefined,
		error ? `${id}-error` : undefined,
	].filter(Boolean);
	return ids.length ? ids.join(" ") : undefined;
}

export type FormFieldProps = {
	/** The control's id; the label points at it. */
	id: string;
	label: ReactNode;
	description?: ReactNode;
	error?: string;
	className?: string;
	children: ReactNode;
};

/**
 * Label, control, help text, and error message in one column. The control
 * sets `aria-invalid` and `aria-describedby={fieldDescriptionIds(...)}`.
 */
export function FormField({
	id,
	label,
	description,
	error,
	className,
	children,
}: FormFieldProps) {
	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<Label htmlFor={id}>{label}</Label>
			{children}
			{description && (
				<p
					id={`${id}-description`}
					className="m-0 text-xs text-muted-foreground"
				>
					{description}
				</p>
			)}
			{error && (
				<p id={`${id}-error`} className="m-0 text-xs text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}
