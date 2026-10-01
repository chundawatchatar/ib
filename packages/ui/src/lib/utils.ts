import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom `rounded-ui` radius so overrides replace it.
const twMerge = extendTailwindMerge({
	extend: { theme: { radius: ["ui"] } },
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Shared focus and disabled treatment for interactive controls.
export const focusRing =
	"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export const disabledState = "disabled:cursor-not-allowed disabled:opacity-55";
