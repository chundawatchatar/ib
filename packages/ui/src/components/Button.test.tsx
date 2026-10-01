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
