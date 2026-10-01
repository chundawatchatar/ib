import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import ThemeToggle from "./ThemeToggle";

// The active page is shown in the accent color; the others stay muted.
const navLinkClass =
	"flex h-full items-center px-2 text-sm font-medium no-underline";
const inactiveNavLinkClass = "text-muted-foreground hover:text-foreground";
const activeNavLinkClass = "text-primary";

export default function Header() {
	return (
		<header className="border-b border-border bg-surface">
			<nav
				aria-label="Main"
				className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-4"
			>
				<Link
					to="/"
					className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-foreground no-underline"
				>
					<Logo className="size-6 text-primary" />
					Salary Manager
				</Link>
				<div className="flex h-full items-center gap-2">
					<Link
						to="/employees"
						className={navLinkClass}
						activeProps={{
							className: activeNavLinkClass,
							"aria-current": "page",
						}}
						inactiveProps={{ className: inactiveNavLinkClass }}
					>
						Employees
					</Link>
					<Link
						to="/insights"
						className={navLinkClass}
						activeProps={{
							className: activeNavLinkClass,
							"aria-current": "page",
						}}
						inactiveProps={{ className: inactiveNavLinkClass }}
					>
						Insights
					</Link>
				</div>
				<div className="ml-auto">
					<ThemeToggle />
				</div>
			</nav>
		</header>
	);
}
