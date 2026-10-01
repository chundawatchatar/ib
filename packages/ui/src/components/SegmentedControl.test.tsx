import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SegmentedControl } from "./SegmentedControl";

afterEach(cleanup);

it("is a named radio group that reports the chosen option", () => {
	const onChange = vi.fn();
	render(
		<SegmentedControl
			label="Currency basis"
			name="view"
			value="local"
			options={[
				{ value: "local", label: "Local currency" },
				{ value: "usd", label: "USD" },
			]}
			onChange={onChange}
		/>,
	);

	expect(screen.getByRole("group", { name: "Currency basis" })).toBeTruthy();
	expect(
		(screen.getByRole("radio", { name: "Local currency" }) as HTMLInputElement)
			.checked,
	).toBe(true);
	fireEvent.click(screen.getByRole("radio", { name: "USD" }));
	expect(onChange).toHaveBeenCalledWith("usd");
});
