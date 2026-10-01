import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { Input } from "./Input";
import { Label } from "./Label";
import { Select } from "./Select";
import { Textarea } from "./Textarea";

afterEach(cleanup);
it("preserves labeled native form controls and selected values", () => {
	render(
		<form aria-label="Employee">
			<Label htmlFor="name">Name</Label>
			<Input id="name" name="name" />
			<Label htmlFor="reason">Reason</Label>
			<Textarea id="reason" name="reason" />
			<Label htmlFor="country">Country</Label>
			<Select id="country" name="country">
				<option value="us">United States</option>
				<option value="in">India</option>
			</Select>
			<Label htmlFor="active">Active</Label>
			<Checkbox id="active" name="active" />
		</form>,
	);
	fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
	fireEvent.change(screen.getByLabelText("Reason"), {
		target: { value: "Promotion" },
	});
	fireEvent.change(screen.getByLabelText("Country"), {
		target: { value: "in" },
	});
	fireEvent.click(screen.getByLabelText("Active"));
	const form = screen.getByRole("form");
	if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
	const values = new FormData(form);
	expect(Object.fromEntries(values)).toEqual({
		name: "Ada",
		reason: "Promotion",
		country: "in",
		active: "on",
	});
});
it("composes a button style onto a link without button semantics", () => {
	render(
		<Button asChild variant="outline">
			<a href="/employees">Employees</a>
		</Button>,
	);
	expect(
		screen.getByRole("link", { name: "Employees" }).getAttribute("href"),
	).toBe("/employees");
	expect(screen.queryByRole("button")).toBeNull();
});
