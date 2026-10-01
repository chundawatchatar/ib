import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { FormField, fieldDescriptionIds } from "./FormField";
import { Input } from "./Input";

afterEach(cleanup);

it("labels the control and links its help and error text", () => {
	const field = { description: "Annual gross", error: "Enter a salary" };
	render(
		<FormField id="salary" label="Salary" {...field}>
			<Input
				id="salary"
				aria-invalid
				aria-describedby={fieldDescriptionIds("salary", field)}
			/>
		</FormField>,
	);

	const input = screen.getByLabelText("Salary");
	expect(input.getAttribute("aria-describedby")).toBe(
		"salary-description salary-error",
	);
	expect(document.getElementById("salary-error")?.textContent).toBe(
		"Enter a salary",
	);
	expect(document.getElementById("salary-description")?.textContent).toBe(
		"Annual gross",
	);
});

it("describes nothing when there is no help or error", () => {
	expect(fieldDescriptionIds("name", {})).toBeUndefined();
});
