import { cva, type VariantProps } from "class-variance-authority";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Search,
} from "lucide-react";
import { cn } from "../lib/utils";

// The single place the icon library is referenced; add icons here by name.
const icons = {
	"arrow-down": ArrowDown,
	"arrow-up": ArrowUp,
	"arrow-up-down": ArrowUpDown,
	"chevron-down": ChevronDown,
	"chevron-left": ChevronLeft,
	"chevron-right": ChevronRight,
	search: Search,
} as const;

export type IconName = keyof typeof icons;

export const iconVariants = cva("shrink-0", {
	variants: {
		size: { sm: "size-3.5", md: "size-4", lg: "size-5" },
	},
	defaultVariants: { size: "md" },
});

export type IconProps = VariantProps<typeof iconVariants> & {
	name: IconName;
	/** Accessible name; omit for decorative icons next to visible text. */
	label?: string;
	className?: string;
};

export function Icon({ name, size, label, className }: IconProps) {
	const Component = icons[name];
	return (
		<Component
			className={cn(iconVariants({ size }), className)}
			strokeWidth={2}
			{...(label
				? { role: "img", "aria-label": label }
				: { "aria-hidden": true })}
		/>
	);
}
