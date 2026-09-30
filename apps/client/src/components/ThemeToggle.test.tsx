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

		expect(
			screen.getByRole("button", { name: /Theme mode: dark/ }),
		).toBeVisible();
		expect(document.documentElement).toHaveClass("dark");
		expect(document.documentElement).toHaveAttribute("data-theme", "dark");
	});

	it("falls back to system mode for an invalid saved theme", () => {
		window.localStorage.setItem("theme", "invalid");
		render(<ThemeToggle />);

		expect(
			screen.getByRole("button", { name: /Theme mode: auto/ }),
		).toBeVisible();
		expect(document.documentElement).toHaveClass("light");
		expect(document.documentElement).not.toHaveAttribute("data-theme");
	});

	it("cycles through light, dark, and system mode and persists the selection", () => {
		render(<ThemeToggle />);
		const button = screen.getByRole("button");

		fireEvent.click(button);
		expect(button).toHaveTextContent("Light");
		expect(window.localStorage.getItem("theme")).toBe("light");
		expect(document.documentElement).toHaveAttribute("data-theme", "light");

		fireEvent.click(button);
		expect(button).toHaveTextContent("Dark");
		expect(window.localStorage.getItem("theme")).toBe("dark");
		expect(document.documentElement).toHaveClass("dark");

		fireEvent.click(button);
		expect(button).toHaveTextContent("Auto");
		expect(window.localStorage.getItem("theme")).toBe("auto");
		expect(document.documentElement).not.toHaveAttribute("data-theme");
	});
});
