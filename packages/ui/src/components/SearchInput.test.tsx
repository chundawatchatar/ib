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
