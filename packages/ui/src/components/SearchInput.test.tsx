import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { SearchInput } from "./SearchInput";

afterEach(cleanup);
it("retains the search convenience wrapper", () => {
	render(
		<SearchInput
			aria-label="Search"
			defaultValue="Ada"
			onDebouncedChange={() => {}}
		/>,
	);
	const input = screen.getByRole("searchbox");
	expect(input.getAttribute("value")).toBe("Ada");
});

it("shows a decorative search icon and applies layout classes to the wrapper", () => {
	const { container } = render(
		<SearchInput
			aria-label="Search"
			className="col-span-2"
			onDebouncedChange={() => {}}
		/>,
	);
	const wrapper = container.firstElementChild;
	expect(wrapper?.className).toContain("col-span-2");
	expect(wrapper?.querySelector("svg[aria-hidden='true']")).not.toBeNull();
});
