import { cn, focusRing } from "../lib/utils";

export type SegmentedControlOption<T extends string> = {
	value: T;
	label: string;
};

export type SegmentedControlProps<T extends string> = {
	/** Accessible name for the group. */
	label: string;
	name: string;
	value: T;
	options: readonly SegmentedControlOption<T>[];
	onChange: (value: T) => void;
	className?: string;
};

/** A single choice among a few options, shown as joined buttons (native radios). */
export function SegmentedControl<T extends string>({
	label,
	name,
	value,
	options,
	onChange,
	className,
}: SegmentedControlProps<T>) {
	return (
		<fieldset
			className={cn(
				"m-0 inline-flex rounded-ui border border-border bg-surface p-0.5",
				className,
			)}
		>
			<legend className="sr-only">{label}</legend>
			{options.map((option) => (
				<label
					key={option.value}
					className={cn(
						"cursor-pointer rounded-ui px-3 py-1.5 text-sm font-medium text-muted-foreground has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
					)}
				>
					<input
						type="radio"
						name={name}
						value={option.value}
						checked={option.value === value}
						onChange={() => onChange(option.value)}
						className={cn("sr-only", focusRing)}
					/>
					{option.label}
				</label>
			))}
		</fieldset>
	);
}
