import { Link } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";

const navLinkClass =
	"rounded-ui px-2 py-1 text-sm font-medium text-muted-foreground no-underline hover:text-foreground";

export default function Header() {
	return (
		<header className="border-b border-border bg-surface">
			<nav
				aria-label="Main"
				className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3"
			>
				<Link
					to="/"
					className="text-base font-semibold text-foreground no-underline"
				>
					Salary Manager
				</Link>
				<div className="flex items-center gap-1">
					<Link
						to="/employees"
						className={navLinkClass}
						activeProps={{
							className: "text-foreground",
							"aria-current": "page",
						}}
					>
						Employees
					</Link>
					<Link
						to="/insights"
						className={navLinkClass}
						activeProps={{
							className: "text-foreground",
							"aria-current": "page",
						}}
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
