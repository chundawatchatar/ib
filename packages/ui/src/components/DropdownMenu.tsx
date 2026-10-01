import * as Menu from "@radix-ui/react-dropdown-menu";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";
import { Icon, Icons } from "./Icon";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuRadioGroup = Menu.RadioGroup;

const itemClass =
	"relative flex cursor-pointer select-none items-center gap-2 rounded-ui px-2 py-1.5 text-sm text-foreground outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-muted-foreground/10 data-[disabled]:opacity-55";

export function DropdownMenuContent({
	className,
	sideOffset = 6,
	align = "end",
	...props
}: ComponentProps<typeof Menu.Content>) {
	return (
		<Menu.Portal>
			<Menu.Content
				{...props}
				sideOffset={sideOffset}
				align={align}
				className={cn(
					"z-50 min-w-36 rounded-ui border border-border bg-surface p-1 shadow-lg",
					className,
				)}
			/>
		</Menu.Portal>
	);
}

export function DropdownMenuItem({
	className,
	...props
}: ComponentProps<typeof Menu.Item>) {
	return <Menu.Item {...props} className={cn(itemClass, className)} />;
}

/** A choice within a `DropdownMenuRadioGroup`; the chosen one shows a check. */
export function DropdownMenuRadioItem({
	className,
	children,
	...props
}: ComponentProps<typeof Menu.RadioItem>) {
	return (
		<Menu.RadioItem {...props} className={cn(itemClass, "pr-8", className)}>
			{children}
			<Menu.ItemIndicator className="absolute right-2 flex items-center">
				<Icon icon={Icons.Check} />
			</Menu.ItemIndicator>
		</Menu.RadioItem>
	);
}

export function DropdownMenuLabel({
	className,
	...props
}: ComponentProps<typeof Menu.Label>) {
	return (
		<Menu.Label
			{...props}
			className={cn(
				"px-2 py-1.5 text-xs font-medium text-muted-foreground",
				className,
			)}
		/>
	);
}

export function DropdownMenuSeparator({
	className,
	...props
}: ComponentProps<typeof Menu.Separator>) {
	return (
		<Menu.Separator
			{...props}
			className={cn("-mx-1 my-1 h-px bg-border", className)}
		/>
	);
}
