import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Icon, Icons } from "./Icon";

afterEach(cleanup);

it("hides decorative icons from assistive technology", () => {
	const { container } = render(<Icon icon={Icons.Search} />);
	const svg = container.querySelector("svg");
	expect(svg?.getAttribute("aria-hidden")).toBe("true");
});

it("names icons that carry meaning on their own", () => {
	render(<Icon icon={Icons.ChevronLeft} label="Previous page" />);
	expect(screen.getByRole("img", { name: "Previous page" })).toBeTruthy();
});
