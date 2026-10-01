import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

afterEach(cleanup);

describe("Button", () => {
	it("defaults to a non-submit button inside a form", () => {
		const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<Button>Action</Button>
			</form>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Action" }));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("allows explicit form submission", () => {
		const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<Button type="submit">Save</Button>
			</form>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(onSubmit).toHaveBeenCalledOnce();
	});

	it("prevents interaction when disabled", () => {
		const onClick = vi.fn();
		render(
			<Button disabled onClick={onClick}>
				Save
			</Button>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		expect(onClick).not.toHaveBeenCalled();
	});
});

describe("Button sizes", () => {
	it.each([
		["sm", "h-8"],
		["md", "h-10"],
		["lg", "h-12"],
	] as const)("applies the %s size", (size, height) => {
		render(<Button size={size}>Sized</Button>);
		expect(screen.getByRole("button", { name: "Sized" }).className).toContain(
			height,
		);
		cleanup();
	});

	it("defaults to the medium size", () => {
		render(<Button>Default</Button>);
		expect(screen.getByRole("button", { name: "Default" }).className).toContain(
			"h-10",
		);
	});
});
