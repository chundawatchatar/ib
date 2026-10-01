import { Icon, Icons } from "@salary-manager/ui";
import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Quiet link back to a parent page, shown above a page heading. */
export function BackLink({
	to,
	children,
}: {
	to: LinkProps["to"];
	children: ReactNode;
}) {
	return (
		<Link
			to={to}
			className="inline-flex items-center gap-1 self-start text-sm text-muted-foreground no-underline hover:text-foreground"
		>
			<Icon icon={Icons.ChevronLeft} />
			{children}
		</Link>
	);
}
