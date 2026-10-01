import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
	Icon,
	type IconComponent,
	Icons,
} from "@salary-manager/ui";
import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "auto";

const themeOptions = [
	{ value: "light", label: "Light", icon: Icons.Sun },
	{ value: "dark", label: "Dark", icon: Icons.Moon },
	{ value: "auto", label: "System", icon: Icons.Monitor },
] as const satisfies readonly {
	value: ThemeMode;
	label: string;
	icon: IconComponent;
}[];

function getInitialMode(): ThemeMode {
	if (typeof window === "undefined") {
		return "auto";
	}

	const stored = window.localStorage.getItem("theme");
	if (stored === "light" || stored === "dark" || stored === "auto") {
		return stored;
	}

	return "auto";
}

function applyThemeMode(mode: ThemeMode) {
	const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
	const resolved = mode === "auto" ? (prefersDark ? "dark" : "light") : mode;

	document.documentElement.classList.remove("light", "dark");
	document.documentElement.classList.add(resolved);

	if (mode === "auto") {
		document.documentElement.removeAttribute("data-theme");
	} else {
		document.documentElement.setAttribute("data-theme", mode);
	}

	document.documentElement.style.colorScheme = resolved;
}

export default function ThemeToggle() {
	const [mode, setMode] = useState<ThemeMode>("auto");

	useEffect(() => {
		const initialMode = getInitialMode();
		setMode(initialMode);
		applyThemeMode(initialMode);
	}, []);

	useEffect(() => {
		if (mode !== "auto") {
			return;
		}

		const media = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => applyThemeMode("auto");

		media.addEventListener("change", onChange);
		return () => {
			media.removeEventListener("change", onChange);
		};
	}, [mode]);

	function selectMode(nextMode: ThemeMode) {
		setMode(nextMode);
		applyThemeMode(nextMode);
		window.localStorage.setItem("theme", nextMode);
	}

	const current = themeOptions.find((option) => option.value === mode);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label={`Theme: ${current?.label ?? "System"}`}
					title="Theme"
					className="text-muted-foreground hover:text-foreground"
				>
					<Icon icon={current?.icon ?? Icons.Monitor} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuRadioGroup
					value={mode}
					onValueChange={(value) => {
						const next = themeOptions.find((option) => option.value === value);
						if (next) selectMode(next.value);
					}}
				>
					{themeOptions.map((option) => (
						<DropdownMenuRadioItem key={option.value} value={option.value}>
							<Icon icon={option.icon} />
							{option.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
