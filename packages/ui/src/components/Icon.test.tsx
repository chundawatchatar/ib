import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Icon } from "./Icon";

afterEach(cleanup);

it("hides decorative icons from assistive technology", () => {
	const { container } = render(<Icon name="search" />);
	const svg = container.querySelector("svg");
	expect(svg?.getAttribute("aria-hidden")).toBe("true");
	expect(svg?.getAttribute("class")).toContain("size-4");
});

it("names icons that carry meaning on their own", () => {
	render(<Icon name="chevron-left" size="sm" label="Previous page" />);
	const icon = screen.getByRole("img", { name: "Previous page" });
	expect(icon.getAttribute("class")).toContain("size-3.5");
});
