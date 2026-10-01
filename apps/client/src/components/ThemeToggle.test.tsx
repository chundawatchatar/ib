import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ThemeToggle from "./ThemeToggle";

describe("ThemeToggle", () => {
	beforeEach(() => {
		window.localStorage.clear();
		document.documentElement.className = "";
		document.documentElement.removeAttribute("data-theme");
		vi.stubGlobal(
			"matchMedia",
			vi.fn(() => ({
				matches: false,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})),
		);
	});

	it("restores the saved dark theme", () => {
		window.localStorage.setItem("theme", "dark");
		render(<ThemeToggle />);

		expect(screen.getByRole("button", { name: "Theme: Dark" })).toBeVisible();
		expect(document.documentElement).toHaveClass("dark");
		expect(document.documentElement).toHaveAttribute("data-theme", "dark");
	});

	it("falls back to system mode for an invalid saved theme", () => {
		window.localStorage.setItem("theme", "invalid");
		render(<ThemeToggle />);

		expect(screen.getByRole("button", { name: "Theme: System" })).toBeVisible();
		expect(document.documentElement).toHaveClass("light");
		expect(document.documentElement).not.toHaveAttribute("data-theme");
	});

	it("switches between light, dark, and system mode and persists the choice", async () => {
		render(<ThemeToggle />);
		const choose = async (name: string) => {
			fireEvent.keyDown(screen.getByRole("button", { name: /^Theme:/ }), {
				key: "Enter",
			});
			fireEvent.click(await screen.findByRole("menuitemradio", { name }));
		};

		await choose("Light");
		expect(screen.getByRole("button", { name: "Theme: Light" })).toBeVisible();
		expect(window.localStorage.getItem("theme")).toBe("light");
		expect(document.documentElement).toHaveAttribute("data-theme", "light");

		await choose("Dark");
		expect(window.localStorage.getItem("theme")).toBe("dark");
		expect(document.documentElement).toHaveClass("dark");

		await choose("System");
		expect(window.localStorage.getItem("theme")).toBe("auto");
		expect(document.documentElement).not.toHaveAttribute("data-theme");
	});
});
